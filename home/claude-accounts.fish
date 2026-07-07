# Personal Claude Code account in personal dirs, work account (~/.claude) everywhere else.
# Not auto-installed — copy to ~/.config/fish/conf.d/ on machines that have both accounts,
# and adjust personal_roots to that machine's layout.
function __claude_account --on-variable PWD
    set -l personal_roots $HOME/Development
    for root in $personal_roots
        if test "$PWD" = "$root"; or string match -q "$root/*" -- $PWD
            set -gx CLAUDE_CONFIG_DIR $HOME/.claude-personal
            return
        end
    end
    set -e CLAUDE_CONFIG_DIR
end
__claude_account
