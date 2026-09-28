#!/bin/zsh
set -e
SCRIPT_DIR="${0:A:h}"
/usr/bin/env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin LANG=en_US.UTF-8 "$SCRIPT_DIR/engine/python/bin/python3" -E -s -B "$SCRIPT_DIR/install_engine.py"
print '\n按回车关闭此窗口。'
read -r
