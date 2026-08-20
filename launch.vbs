Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node D:\小零\server.js", 0, False
WScript.Sleep 2000
WshShell.Run "msedge --app=http://localhost:20173", 1, False
