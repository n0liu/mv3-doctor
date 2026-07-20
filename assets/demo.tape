# Demo recording for mv3-doctor's README.
#
# Prerequisites:  brew install vhs   (pulls in ffmpeg + ttyd)
# Setup:          npm run build && npm link   (so `mv3-doctor` resolves globally)
# Generate:       vhs assets/demo.tape
# Cleanup:        npm unlink -g mv3-doctor
# Output:         assets/demo.gif

Output assets/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1280
Set Height 660
Set Padding 24
Set Theme "Dracula"
Set TypingSpeed 55ms

Sleep 800ms
Type "mv3-doctor examples/leaky-extension"
Sleep 600ms
Enter
Sleep 5s
