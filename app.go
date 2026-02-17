package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	gossh "golang.org/x/crypto/ssh"
)

type App struct {
	ctx        context.Context
	sessions   map[string]*Session
	sessionsMu sync.Mutex
}

type Session struct {
	client  *gossh.Client
	session *gossh.Session
	stdin   io.WriteCloser
	hostID  string
}

type SSHHost struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Host         string    `json:"host"`
	Port         int       `json:"port"`
	User         string    `json:"user"`
	Password     string    `json:"password"`
	IdentityFile string    `json:"identityFile"`
	Tags         []string  `json:"tags"`
	Color        string    `json:"color"`
	LastUsed     time.Time `json:"lastUsed"`
	UseCount     int       `json:"useCount"`
	Description  string    `json:"description"`
}

type ServerSettings struct {
	TerminalType string `json:"terminalType"` // "terminal" or "cmd"
}

type AppSettings struct {
	DefaultTerminalType string                    `json:"defaultTerminalType"` // "terminal" or "cmd"
	AutoCopyCatOutput bool                      `json:"autoCopyCatOutput"` // auto-copy cat command output to clipboard
	ServerSettings    map[string]ServerSettings `json:"serverSettings"`    // hostID -> settings
}

type AppData struct {
	Hosts    []SSHHost   `json:"hosts"`
	Settings AppSettings `json:"settings"`
}

func NewApp() *App {
	return &App{sessions: make(map[string]*Session)}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.ensureDataDir()
}

func (a *App) dataPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".flashssh", "hosts.json")
}

func (a *App) ensureDataDir() {
	home, _ := os.UserHomeDir()
	os.MkdirAll(filepath.Join(home, ".flashssh"), 0700)
}

func (a *App) loadData() AppData {
	data := AppData{
		Hosts: []SSHHost{},
		Settings: AppSettings{
			DefaultTerminalType: "terminal",
			AutoCopyCatOutput: true,
			ServerSettings:    make(map[string]ServerSettings),
		},
	}
	b, err := os.ReadFile(a.dataPath())
	if err != nil {
		return data
	}
	if err := json.Unmarshal(b, &data); err != nil {
		return AppData{
			Hosts: []SSHHost{},
			Settings: AppSettings{
				DefaultTerminalType: "terminal",
				AutoCopyCatOutput: true,
				ServerSettings:    make(map[string]ServerSettings),
			},
		}
	}
	if data.Hosts == nil {
		data.Hosts = []SSHHost{}
	}
	if data.Settings.ServerSettings == nil {
		data.Settings.ServerSettings = make(map[string]ServerSettings)
	}
	if data.Settings.DefaultTerminalType == "" {
		data.Settings.DefaultTerminalType = "terminal"
	}
	// AutoCopyCatOutput defaults to true if not set
	if !data.Settings.AutoCopyCatOutput {
		data.Settings.AutoCopyCatOutput = true
	}
	return data
}

func (a *App) saveData(data AppData) error {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.dataPath(), b, 0600)
}

func (a *App) GetHosts() []SSHHost {
	data := a.loadData()
	if data.Hosts == nil {
		return []SSHHost{}
	}
	sort.Slice(data.Hosts, func(i, j int) bool {
		return data.Hosts[i].LastUsed.After(data.Hosts[j].LastUsed)
	})
	return data.Hosts
}

func (a *App) AddHost(host SSHHost) error {
	data := a.loadData()
	host.ID = fmt.Sprintf("%d", time.Now().UnixNano())
	if host.Port == 0 {
		host.Port = 22
	}
	if host.Color == "" {
		colors := []string{"#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"}
		host.Color = colors[len(data.Hosts)%len(colors)]
	}
	if host.Tags == nil {
		host.Tags = []string{}
	}
	data.Hosts = append(data.Hosts, host)
	return a.saveData(data)
}

func (a *App) UpdateHost(host SSHHost) error {
	data := a.loadData()
	for i, h := range data.Hosts {
		if h.ID == host.ID {
			data.Hosts[i] = host
			return a.saveData(data)
		}
	}
	return fmt.Errorf("host not found")
}

func (a *App) DeleteHost(id string) error {
	data := a.loadData()
	filtered := []SSHHost{}
	for _, h := range data.Hosts {
		if h.ID != id {
			filtered = append(filtered, h)
		}
	}
	data.Hosts = filtered
	a.sessionsMu.Lock()
	if sess, ok := a.sessions[id]; ok {
		sess.session.Close()
		sess.client.Close()
		delete(a.sessions, id)
	}
	a.sessionsMu.Unlock()
	return a.saveData(data)
}

// emit writes a styled message to the terminal for the given host id
func (a *App) emit(id, data string) {
	runtime.EventsEmit(a.ctx, "terminal:data", map[string]string{"id": id, "data": data})
}

func (a *App) emitError(id, msg string) {
	a.emit(id, fmt.Sprintf("\r\n\x1b[1;31m✖ Error:\x1b[0m \x1b[31m%s\x1b[0m\r\n", msg))
}

func (a *App) emitInfo(id, msg string) {
	a.emit(id, fmt.Sprintf("\x1b[90m%s\x1b[0m\r\n", msg))
}

func (a *App) ConnectSSH(id string) error {
	data := a.loadData()
	var host *SSHHost
	for i, h := range data.Hosts {
		if h.ID == id {
			host = &data.Hosts[i]
			break
		}
	}
	if host == nil {
		return fmt.Errorf("host not found")
	}

	// Close any existing session cleanly
	a.closeSession(id)

	port := host.Port
	if port == 0 {
		port = 22
	}
	user := host.User
	if user == "" {
		user = "root"
	}
	addr := fmt.Sprintf("%s:%d", host.Host, port)

	a.emitInfo(id, fmt.Sprintf("  Connecting to %s@%s …", user, addr))

	// Build auth methods with clear diagnostics
	var authMethods []gossh.AuthMethod
	var authDesc []string

	if host.Password != "" {
		authMethods = append(authMethods,
			gossh.Password(host.Password),
			gossh.KeyboardInteractive(func(name, instruction string, questions []string, echos []bool) ([]string, error) {
				answers := make([]string, len(questions))
				for i := range questions {
					answers[i] = host.Password
				}
				return answers, nil
			}),
		)
		authDesc = append(authDesc, "password")
	}

	// Resolve key path
	keyPath := host.IdentityFile
	if keyPath != "" && strings.HasPrefix(keyPath, "~") {
		home, _ := os.UserHomeDir()
		keyPath = filepath.Join(home, keyPath[1:])
	}
	// Auto-detect default keys only if no password set
	if keyPath == "" && host.Password == "" {
		home, _ := os.UserHomeDir()
		for _, k := range []string{"id_ed25519", "id_rsa", "id_ecdsa", "id_dsa"} {
			p := filepath.Join(home, ".ssh", k)
			if _, err := os.Stat(p); err == nil {
				keyPath = p
				break
			}
		}
	}
	if keyPath != "" {
		keyBytes, err := os.ReadFile(keyPath)
		if err != nil {
			a.emitError(id, fmt.Sprintf("Cannot read key file %s: %v", keyPath, err))
		} else {
			signer, err := gossh.ParsePrivateKey(keyBytes)
			if err != nil {
				a.emitError(id, fmt.Sprintf("Cannot parse key file %s: %v", keyPath, err))
			} else {
				authMethods = append(authMethods, gossh.PublicKeys(signer))
				authDesc = append(authDesc, fmt.Sprintf("key(%s)", filepath.Base(keyPath)))
			}
		}
	}

	if len(authMethods) == 0 {
		msg := "No authentication method available.\r\n  → Add a password, or ensure ~/.ssh/id_rsa (or id_ed25519) exists."
		a.emitError(id, msg)
		return fmt.Errorf("no auth method available")
	}

	a.emitInfo(id, fmt.Sprintf("  Auth: %s", strings.Join(authDesc, ", ")))

	cfg := &gossh.ClientConfig{
		User:            user,
		Auth:            authMethods,
		HostKeyCallback: gossh.InsecureIgnoreHostKey(),
		Timeout:         15 * time.Second,
	}

	client, err := gossh.Dial("tcp", addr, cfg)
	if err != nil {
		// Provide specific, actionable error messages
		errMsg := err.Error()
		friendly := errMsg
		if strings.Contains(errMsg, "unable to authenticate") || strings.Contains(errMsg, "no supported methods") {
			friendly = "Authentication failed — check your username and password/key.\r\n  Server response: " + errMsg
		} else if strings.Contains(errMsg, "connection refused") {
			friendly = fmt.Sprintf("Connection refused on %s — is SSH running on that host/port?", addr)
		} else if strings.Contains(errMsg, "no such host") || strings.Contains(errMsg, "no route") {
			friendly = fmt.Sprintf("Host unreachable: '%s' — check the hostname/IP.", host.Host)
		} else if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "i/o timeout") {
			friendly = fmt.Sprintf("Connection timed out to %s — host may be offline or firewall is blocking port %d.", addr, port)
		}
		a.emitError(id, friendly)
		runtime.EventsEmit(a.ctx, "terminal:error", map[string]string{"id": id, "msg": friendly})
		return fmt.Errorf("%s", friendly)
	}

	sess, err := client.NewSession()
	if err != nil {
		client.Close()
		a.emitError(id, "Failed to open SSH session: "+err.Error())
		return err
	}

	modes := gossh.TerminalModes{
		gossh.ECHO:          1,
		gossh.TTY_OP_ISPEED: 38400,
		gossh.TTY_OP_OSPEED: 38400,
	}
	if err := sess.RequestPty("xterm-256color", 40, 200, modes); err != nil {
		sess.Close()
		client.Close()
		a.emitError(id, "PTY request failed: "+err.Error())
		return err
	}

	stdin, err := sess.StdinPipe()
	if err != nil {
		sess.Close()
		client.Close()
		return err
	}

	stdout, err := sess.StdoutPipe()
	if err != nil {
		sess.Close()
		client.Close()
		return err
	}
	// Note: don't get stderr pipe when using shell — it conflicts with PTY on some servers

	if err := sess.Shell(); err != nil {
		sess.Close()
		client.Close()
		a.emitError(id, "Failed to start shell: "+err.Error())
		return err
	}

	// Store session before starting goroutine
	a.sessionsMu.Lock()
	a.sessions[id] = &Session{client: client, session: sess, stdin: stdin, hostID: id}
	a.sessionsMu.Unlock()

	// Update usage stats
	host.LastUsed = time.Now()
	host.UseCount++
	a.saveData(data)

	// Emit connected event
	runtime.EventsEmit(a.ctx, "terminal:connected", map[string]string{"id": id})

	// Stream stdout → frontend
	go func() {
		buf := make([]byte, 32*1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				a.emit(id, string(buf[:n]))
			}
			if err != nil {
				break
			}
		}
		// Session ended — clean up
		a.sessionsMu.Lock()
		_, stillExists := a.sessions[id]
		if stillExists {
			delete(a.sessions, id)
		}
		a.sessionsMu.Unlock()

		if stillExists {
			a.emit(id, "\r\n\x1b[90m─── Connection closed ───\x1b[0m\r\n")
			runtime.EventsEmit(a.ctx, "terminal:closed", map[string]string{"id": id})
		}
	}()

	return nil
}

// closeSession closes a session without emitting events (internal use)
func (a *App) closeSession(id string) {
	a.sessionsMu.Lock()
	sess, ok := a.sessions[id]
	if ok {
		delete(a.sessions, id)
	}
	a.sessionsMu.Unlock()
	if ok {
		sess.stdin.Close()
		sess.session.Close()
		sess.client.Close()
	}
}

func (a *App) SendInput(id string, input string) error {
	a.sessionsMu.Lock()
	sess, ok := a.sessions[id]
	a.sessionsMu.Unlock()
	if !ok {
		return nil // silently ignore — terminal may have just closed
	}
	_, err := sess.stdin.Write([]byte(input))
	return err
}

func (a *App) ResizeTerminal(id string, cols int, rows int) error {
	// Validate dimensions
	if cols <= 0 || rows <= 0 || cols > 1000 || rows > 1000 {
		return fmt.Errorf("invalid terminal dimensions: %dx%d", cols, rows)
	}

	a.sessionsMu.Lock()
	sess, ok := a.sessions[id]
	a.sessionsMu.Unlock()
	if !ok {
		return nil // Session may have been closed, that's ok
	}

	if err := sess.session.WindowChange(rows, cols); err != nil {
		// Log the error but don't fail the operation
		// Some SSH servers may not support window changes
		fmt.Printf("Warning: terminal resize failed for session %s: %v\n", id, err)
		return nil
	}
	
	return nil
}

func (a *App) DisconnectSSH(id string) error {
	a.sessionsMu.Lock()
	sess, ok := a.sessions[id]
	if ok {
		delete(a.sessions, id)
	}
	a.sessionsMu.Unlock()
	if ok {
		sess.stdin.Close()
		sess.session.Close()
		sess.client.Close()
		a.emit(id, "\r\n\x1b[90m─── Disconnected ───\x1b[0m\r\n")
		runtime.EventsEmit(a.ctx, "terminal:closed", map[string]string{"id": id})
	}
	return nil
}

func (a *App) IsConnected(id string) bool {
	a.sessionsMu.Lock()
	defer a.sessionsMu.Unlock()
	_, ok := a.sessions[id]
	return ok
}

func (a *App) GetAllTags() []string {
	data := a.loadData()
	tagMap := map[string]bool{}
	for _, h := range data.Hosts {
		for _, t := range h.Tags {
			tagMap[t] = true
		}
	}
	tags := []string{}
	for t := range tagMap {
		tags = append(tags, t)
	}
	sort.Strings(tags)
	return tags
}

func (a *App) ImportFromSSHConfig() (int, error) {
	home, _ := os.UserHomeDir()
	content, err := os.ReadFile(filepath.Join(home, ".ssh", "config"))
	if err != nil {
		return 0, fmt.Errorf("could not read ~/.ssh/config: %w", err)
	}
	data := a.loadData()
	existing := map[string]bool{}
	for _, h := range data.Hosts {
		existing[h.Host] = true
	}
	var cur *SSHHost
	imported := 0
	for _, line := range strings.Split(string(content), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, " ", 2)
		if len(parts) != 2 {
			continue
		}
		key, val := strings.ToLower(strings.TrimSpace(parts[0])), strings.TrimSpace(parts[1])
		switch key {
		case "host":
			if cur != nil && cur.Host != "" && !existing[cur.Host] {
				cur.ID = fmt.Sprintf("%d_%d", time.Now().UnixNano(), imported)
				if cur.Port == 0 {
					cur.Port = 22
				}
				colors := []string{"#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"}
				cur.Color = colors[(len(data.Hosts)+imported)%len(colors)]
				cur.Tags = []string{"imported"}
				data.Hosts = append(data.Hosts, *cur)
				imported++
			}
			cur = &SSHHost{Name: val, Host: val, Tags: []string{}}
		case "hostname":
			if cur != nil {
				cur.Host = val
			}
		case "user":
			if cur != nil {
				cur.User = val
			}
		case "port":
			if cur != nil {
				fmt.Sscanf(val, "%d", &cur.Port)
			}
		case "identityfile":
			if cur != nil {
				cur.IdentityFile = val
			}
		}
	}
	if cur != nil && cur.Host != "" && !existing[cur.Host] {
		cur.ID = fmt.Sprintf("%d_%d", time.Now().UnixNano(), imported)
		if cur.Port == 0 {
			cur.Port = 22
		}
		colors := []string{"#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"}
		cur.Color = colors[(len(data.Hosts)+imported)%len(colors)]
		cur.Tags = []string{"imported"}
		data.Hosts = append(data.Hosts, *cur)
		imported++
	}
	return imported, a.saveData(data)
}

func (a *App) GetSettings() AppSettings {
	data := a.loadData()
	return data.Settings
}

func (a *App) SaveSettings(settings AppSettings) error {
	data := a.loadData()
	data.Settings = settings
	return a.saveData(data)
}

func (a *App) GetServerSettings(hostId string) ServerSettings {
	data := a.loadData()
	if serverSettings, exists := data.Settings.ServerSettings[hostId]; exists {
		return serverSettings
	}
	return ServerSettings{TerminalType: data.Settings.DefaultTerminalType}
}

func (a *App) SaveServerSettings(hostId string, serverSettings ServerSettings) error {
	data := a.loadData()
	if data.Settings.ServerSettings == nil {
		data.Settings.ServerSettings = make(map[string]ServerSettings)
	}
	data.Settings.ServerSettings[hostId] = serverSettings
	return a.saveData(data)
}
