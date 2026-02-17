# ⚡ FlashSSH

A sleek, fast SSH connection manager built with **Go** + **Wails** + **React**.

📁 **Repository**: https://github.com/Genius740Code/FlashSSH

Add your SSH hosts, tag and organize them, then connect with a single click — FlashSSH opens a terminal and SSH's in automatically.

---

## ✨ Features

- **Add & manage SSH hosts** with name, host, port, user, and identity file
- **One-click connect** — opens your system terminal and SSHs in
- **Copy SSH command** to clipboard instantly
- **Tags** to organize hosts (production, dev, database, etc.)
- **Import from `~/.ssh/config`** — automatically pull in your existing hosts
- **Grid & List views** with search and tag filtering
- **SSH command preview** while adding/editing a host
- **Keyboard shortcuts**: `⌘N` new host, `⌘F` search, `Esc` close
- **Persistent storage** in `~/.flashssh/hosts.json`
- **Cross-platform**: macOS, Linux (auto-detects terminal), Windows

---

## 🚀 Getting Started

### Installation

#### Download Pre-built Binaries

Grab the latest release from the [GitHub Releases](https://github.com/Genius740Code/FlashSSH/releases) page for your platform:

- **Windows**: `flashssh-windows.exe`
- **macOS**: `flashssh-macos` (Intel/Apple Silicon universal)
- **Linux**: `flashssh-linux`

#### Build from Source

If you prefer to build from source or contribute to development:

### Prerequisites

1. **Go 1.21+** — [golang.org/dl](https://golang.org/dl/)
2. **Node.js 18+** — [nodejs.org](https://nodejs.org/)
3. **Wails v2** — Install with:
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```
4. **Platform dependencies** (Linux only):
   ```bash
   # Debian/Ubuntu
   sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev
   ```

### Run in development

```bash
git clone https://github.com/Genius740Code/FlashSSH.git
cd FlashSSH
wails dev
```

### Build for production

```bash
wails build
```

The binary will be in `./build/bin/flashssh`.

---

## 🗂 Project Structure

```
flashssh/
├── main.go            # Wails app entry point
├── app.go             # Go backend — SSH host management & connect logic
├── go.mod             # Go module
├── wails.json         # Wails config
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx            # Root component
        ├── styles/
        │   ├── globals.css
        │   └── App.module.css
        ├── components/
        │   ├── Sidebar.jsx    # Tags & navigation
        │   ├── HostCard.jsx   # Individual host card (grid + list)
        │   ├── HostModal.jsx  # Add/edit host dialog
        │   ├── EmptyState.jsx # No hosts screen
        │   └── Toast.jsx      # Notifications
        └── wailsjs/
            └── go/main/App.js # Wails bindings + dev mock
```

---

## 🔧 How It Works

- **Data** is stored in `~/.flashssh/hosts.json` (mode 0600)
- **Connect** opens your system terminal:
  - **macOS**: Uses `osascript` to open Terminal.app
  - **Linux**: Auto-detects gnome-terminal, xterm, konsole, alacritty, kitty, etc.
  - **Windows**: Prefers Windows Terminal (`wt`), falls back to `cmd`
- **Wails** bridges Go ↔ React via generated bindings
- **Import** parses `~/.ssh/config` for `Host`, `HostName`, `User`, `Port`, `IdentityFile`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘N` / `Ctrl+N` | Add new host |
| `⌘F` / `Ctrl+F` | Focus search |
| `Esc` | Close modal |

---

## 🎨 Design

- Dark terminal aesthetic with JetBrains Mono + Syne typefaces
- Per-host color coding with glowing connect buttons
- Smooth CSS animations throughout
- CSS Modules for scoped styles — no style leakage

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/FlashSSH.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Commit your changes: `git commit -m 'Add some amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Genius740Code/FlashSSH/blob/main/LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Wails v2](https://wails.io/) - Go + React desktop app framework
- Terminal detection logic inspired by various open-source SSH tools
- Thanks to all contributors who help make FlashSSH better!
