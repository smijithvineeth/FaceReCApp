# Installation Guide - Yii2 Navigation Extension

## What I Fixed

1. **Configuration Error**: Changed `language = "PHP"` to `languages = ["PHP"]` in extension.toml
2. **Added Debug Logging**: The language server now logs to Zed's console to help troubleshoot
3. **Path Resolution Bug**: Fixed backslash handling for Windows paths

## Prerequisites

- **Node.js** must be installed: https://nodejs.org/
- Test by running: `node --version` in terminal

## Installation Steps

### 1. Copy Extension to Zed Directory

Copy the entire `zed-yii2-navigation` folder to:

**Windows:**
```
%APPDATA%\Zed\extensions\installed\yii2-navigation\
```

**macOS:**
```
~/Library/Application Support/Zed/extensions/installed/yii2-navigation/
```

**Linux:**
```
~/.config/zed/extensions/installed/yii2-navigation/
```

### 2. Verify Files Are Present

The folder should contain:
- `extension.wasm`
- `extension.toml`
- `language_server/` folder with `server.js`
- `language_server/node_modules/` folder

### 3. Configure Zed Settings

Open Zed settings (`Ctrl+,` or `Cmd+,`) and add:

```json
{
  "languages": {
    "PHP": {
      "language_servers": ["yii2-ls", "..."]
    }
  }
}
```

**Important**: The `"..."` keeps other PHP language servers active. If you want ONLY this extension:

```json
{
  "languages": {
    "PHP": {
      "language_servers": ["yii2-ls"]
    }
  }
}
```

### 4. Restart Zed Completely

- Close all Zed windows
- Quit the application completely
- Restart Zed

### 5. Check Logs

After opening a PHP file, check if the extension loaded:

1. Go to: **View → Developer → Open Logs** (or **View → Logs**)
2. Look for: `"Yii2 Language Server initialized successfully!"`
3. If you see this, the extension is working!

## Testing

Create a test to verify it works:

**controllers/SiteController.php:**
```php
<?php
class SiteController {
    public function actionIndex() {
        return $this->render('index');
    }
}
```

**views/site/index.php:**
```php
<h1>Test</h1>
```

1. Open `SiteController.php` in Zed
2. Hold Ctrl (Cmd on Mac)
3. Hover over the **string** `'index'` (not the word `render`)
4. It should underline/highlight
5. Click to jump to the view file

## Debugging

If Ctrl+Click doesn't work:

1. **Check Logs** - Look for error messages in Zed logs
2. **Check the string position** - Cursor must be ON the quote string `'index'`, not on `render`
3. **Check Node.js** - Run `node --version` to verify it's installed
4. **Check file structure** - Make sure your project follows Yii2 structure:
   - `controllers/XxxController.php`
   - `views/xxx/viewname.php`

## Debug Logs You Should See

When you Ctrl+Click on `'index'`, the logs should show:

```
Yii2 Language Server initialized successfully!
Definition request received at 3:27
Line content:         return $this->render('index');
Found view name: index
Document path: C:\path\to\controllers\SiteController.php
Resolved view path: C:\path\to\views\site\index.php
Returning URI: file:///C:/path/to/views/site/index.php
```

If you see `"No render() call found at cursor position"`, your cursor isn't on the string.

If you don't see any logs at all, the language server isn't loading.

## Common Issues

### Extension Not Loading
- Verify folder is in correct location
- Restart Zed completely
- Check extension.toml is present

### No Highlighting on Hover
- Check Zed settings have `"yii2-ls"` configured
- Make sure you're on a `.php` file
- Check logs for initialization message

### Clicks But Doesn't Navigate
- Check logs to see what path was resolved
- Verify the view file actually exists
- Check your project structure matches Yii2 conventions

## Need Help?

See `TROUBLESHOOTING.md` for detailed debugging steps.

## Sources

- [Zed Language Extensions Documentation](https://zed.dev/docs/extensions/languages)
- [Configuring Languages in Zed](https://zed.dev/docs/configuring-languages)
- [PHP in Zed](https://zed.dev/docs/languages/php)
