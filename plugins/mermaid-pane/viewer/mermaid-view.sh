#!/bin/sh
# Usage: mermaid-view.sh CHAFA OPENER ITEM...  where ITEM is png:<path> or error:<text>
chafa=$1
opener=$2
shift 2
n=$#
[ "$n" -gt 0 ] || exit 0
k=0
for item in "$@"; do
  k=$((k + 1))
  eval "item_$k=\$item"
done
i=1
esc=$(printf '\033')

saved=$(stty -g)
cleanup() {
  stty "$saved"
  printf '\033_Ga=d\033\\\033[?25h\033[2J\033[H'
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM
# Reads give up after half a second, so the loop notices a resize without a key.
stty -icanon -echo min 0 time 5
printf '\033[?25l'

draw() {
  eval "current=\$item_$i"
  drawn=$(stty size)
  rows=${drawn% *}
  cols=${drawn#* }
  height=$((rows - 2))
  [ "$height" -gt 0 ] || height=1
  [ "$cols" -gt 0 ] || cols=1
  printf '\033_Ga=d\033\\\033[2J\033[H'
  printf '\033[1mmermaid %d/%d\033[0m   \033[2m← → page · o open · q quit\033[0m\n' "$i" "$n"
  case $current in
    png:*) "$chafa" -f kitty --probe off --size "${cols}x${height}" "${current#png:}" ;;
    error:*) printf '\nDiagram %d could not be rendered:\n\033[31m%s\033[0m\n' "$i" "${current#error:}" ;;
  esac
}

page() {
  i=$(( (i - 1 + $1 + n) % n + 1 ))
  draw
}

draw
while :; do
  key=$(dd bs=1 count=1 2>/dev/null)
  case $key in
    q) exit 0 ;;
    o) case $current in png:*) "$opener" "${current#png:}" >/dev/null 2>&1 & ;; esac ;;
    "$esc")
      rest=$(dd bs=1 count=2 2>/dev/null)
      case $rest in
        '[C' | 'OC') page 1 ;;
        '[D' | 'OD') page -1 ;;
        '') exit 0 ;;
      esac
      ;;
    '') [ "$(stty size)" = "$drawn" ] || draw ;;
  esac
done
