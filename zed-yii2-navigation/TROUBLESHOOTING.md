# Troubleshooting Yii2 Navigation Extension

## Issue: Ctrl+Click Does Nothing / No Highlighting

### Check 1: Extension is Installed
1. Open Zed
2. Go to Extensions (View → Extensions or Ctrl+Shift+X)
3. Check if "Yii2 Navigation" appears in the installed extensions list
4. If not listed, the extension wasn't installed correctly

### Check 2: Verify Installation Path
Make sure the extension is in the correct location:
- Windows: `%APPDATA%\Zed\extensions\installed\yii2-navigation\`
- The folder should contain:
  - `extension.wasm`
  - `extension.toml`
  - `language_server/` directory with `server.js`

### Check 3: Node.js is Required
The language server runs on Node.js:
1. Open terminal/command prompt
2. Run: `node --version`
3. If you get an error, install Node.js from https://nodejs.org/

### Check 4: Check Zed Logs
1. In Zed, open: View → Developer → Open Logs (or View → Logs)
2. Look for errors related to "yii2-navigation" or "yii2-ls"
3. Common errors:
   - "Failed to start language server" - Node.js not found
   - "Extension failed to load" - WASM file corrupted
   - No mention of yii2 at all - Extension not detected

### Check 5: Test Language Server Directly
Run the language server manually to test:

```bash
cd %APPDATA%\Zed\extensions\installed\yii2-navigation\language_server
node server.js
```

You should see it waiting for input (LSP uses stdin/stdout). Press Ctrl+C to exit.

### Check 6: Zed Settings Configuration
This extension might conflict with existing PHP language servers. Check your Zed settings:

1. Open Settings: Ctrl+, (or Cmd+, on Mac)
2. Add this configuration:

```json
{
  "languages": {
    "PHP": {
      "language_servers": ["yii2-ls"]
    }
  }
}
```

**Important**: This replaces other PHP language servers. If you need both:
```json
{
  "languages": {
    "PHP": {
      "language_servers": ["yii2-ls", "intelephense"]
    }
  }
}
```

### Check 7: Restart is Required
After installation or configuration changes:
1. Completely quit Zed (not just close window)
2. Restart Zed
3. Open a PHP file

### Check 8: Correct File Type
The extension only works on PHP files:
- File must have `.php` extension
- Zed must recognize it as PHP (check bottom right corner of editor)

### Check 9: Cursor Position
The cursor must be ON the string literal:
- ✅ Correct: Cursor on `'index'` in `$this->render('index')`
- ❌ Wrong: Cursor on `render`
- ❌ Wrong: Cursor on `$this`

### Check 10: Test with Simple File
Create a test file to verify:

**controllers/TestController.php:**
```php
<?php
class TestController {
    public function actionIndex() {
        return $this->render('index');
    }
}
```

**views/test/index.php:**
```php
<h1>Test View</h1>
```

Try Ctrl+Click on the `'index'` string.

## Still Not Working?

If none of the above helps, the issue might be that Zed's extension API doesn't support custom language servers for PHP, or there's a conflict with built-in PHP support.

### Alternative: Check if Zed Supports Custom Language Servers
Zed might only support language servers for certain languages. Check Zed documentation:
https://zed.dev/docs/extensions

### Collect Debug Info
Please provide:
1. Zed version (Help → About Zed)
2. Operating System
3. Content of Zed logs related to "yii2"
4. Output of `node --version`
5. Does the extension appear in Extensions panel?
