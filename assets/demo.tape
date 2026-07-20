# Demo recording for mv3-doctor's README.
#
# Prerequisites:  brew install vhs   (pulls in ffmpeg + ttyd)
# Generate:       npm run build && vhs assets/demo.tape
# Output:         assets/demo.gif
#
# The hidden alias lets the recording show the clean `mv3-doctor` command
# without needing the package published to npm first.

Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1280
Set Height 640
Set Padding 24
Set Theme "Dracula"
Set TypingSpeed 55ms

Hidden
Type "alias mv3-doctor='node dist/cli.js'"
Enter
Type "clear"
Enter
Show

Sleep 700ms
Type "mv3-doctor examples/leaky-extension"
Sleep 600ms
Enter
Sleep 4500ms
