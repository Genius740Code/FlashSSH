package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "FlashSSH",
		Width:            1200,
		Height:           750,
		MinWidth:         900,
		MinHeight:        600,
		BackgroundColour: &options.RGBA{R: 15, G: 15, B: 17, A: 255},
		OnStartup:        app.startup,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  true,
				HideToolbarSeparator:       true,
				FullSizeContent:            true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WindowIsTranslucent:  false,
			WebviewIsTransparent: false,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		Linux: &linux.Options{
			WindowIsTranslucent: false,
		},
		EnableDefaultContextMenu: false,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
