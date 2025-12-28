#!/usr/bin/env bash

# 1. Complex Variable Expansion & Braces
# --------------------------------------
: "${parameter:?error}" "${var#prefix}" "${var%%suffix}"
echo ${ARRAY[@]:1:2}
echo ${!varprefix*} # Indirect expansion

# 2. Nested Subshells and Quotes
# ------------------------------
result=$(echo "The date is $(date +%D) and I'm in $(pwd)")
complex_quotes="'single' inside \"double with \$(command) inside\""

# 3. Heredocs with internal logic
# -------------------------------
cat <<EOF > /tmp/test_file
  This is a heredoc.
  Variable evaluation: $HOME
  $(echo "Nested command execution")
EOF

cat <<'EXPECTED'
  This heredoc is quoted, so $VARIABLES and $(commands)
  should NOT be highlighted as active code.
EXPECTED

# 4. Process Substitution & Redirection
# -------------------------------------
diff <(ls -1 /bin) <(ls -1 /usr/bin) 2>/dev/null >&1

# 5. Arrays and Associative Arrays (Bash 4+)
# ------------------------------------------
declare -A colors=( ["red"]="#ff0000" ["green"]="#00ff00" )
for key in "${!colors[@]}"; do
    echo "Key: $key, Value: ${colors[$key]}"
done

# 6. Regex and Arithmetic
# -----------------------
if [[ "test123" =~ [a-z]+[0-9]{3} ]]; then
    (( x = (5 + 3) * 2 ))
    let "y = x >> 1"
fi

# 7. Function with weird naming and local scope
# ---------------------------------------------
function _internal-helper() {
    local -a list=("one" "two" "three")
    [[ -f "$1" ]] && return 0 || return 1
}

# 8. The "Evil" Case: Escaped Quotes and Comments
# -----------------------------------------------
echo "This is not a #comment"
echo 'This is not a $variable'
echo "Escaped \"double quotes\" in strings"
# What if a line ends with a backslash? \
echo "This is still part of the previous logic in some parsers"

#!/usr/bin/env bash

# 1. Stressing Recursive Subshells and Escaping
# --------------------------------------------
# Highlighting should handle the transition from $( ) to " " to $( )
NESTED=$(echo "Outer $(echo "Inner $(echo 'Deepest')")")
echo "Escaped quotes: \"Nested \$(command) should be code, but this isn't: \$VAR\""

# 2. Advanced Parameter Expansion (The "Operator" Test)
# ----------------------------------------------------
# Testing !, #, %, /, and , operators inside ${ }
echo "${VAR:-default}"     # Default value
echo "${#ARRAY[@]}"        # Length of array
echo "${STR//pattern/sub}" # Global replacement
echo "${PATH#*:}"          # Remove shortest prefix
echo "${NAME,,}"           # Lowercase transformation (Bash 4)

# 3. Process Substitution & Redirection Matrix
# -------------------------------------------
# Highlighting should distinguish <( ) as an operator/subshell
comm -3 <(ls -1 dir1 | sort) <(ls -1 dir2 | sort) 2>/dev/null >&1

# 4. Multi-line Quoted Strings and Continuity
# ------------------------------------------
echo "This is a string \
that spans multiple lines \
using backslashes."

# 5. Arithmetic Stress (Naked Variables & Bitwise)
# ------------------------------------------------
# 'i' and 'j' should be 'var', while << and | are 'oper'
(( i = 10, j = i << 2 | 1 ))
let "result = (i + 5) / 2"

# 6. Associative Arrays with Complex Keys
# ---------------------------------------
declare -A MAP
MAP["key with spaces"]="$(date +%s)"
for k in "${!MAP[@]}"; do
    echo "Key: $k -> Value: ${MAP[$k]}"
done

# 7. Function with Redirections & Local Scoping
# ---------------------------------------------
function __complex-cleanup() {
    local -i status=$?
    [[ $status -ne 0 ]] && {
        echo "Error on line $1" >&2
        return "$status"
    }
}

# 8. The "Trap" and Signal Test
# -----------------------------
trap 'echo "Terminated by signal"; exit 1' SIGINT SIGTERM

# 9. Weird Filenames and Globbing
# -------------------------------
cat ./"file with $variable.txt" *.log

# 10. The Regex "Kitchen Sink"
# ----------------------------
if [[ "user@domain.com" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$ ]]; then
    echo "Valid Email"
fi

# Chaos Test: Nested math, escaped math, and strings in redirections
(( 1 || ( $(echo 5) > 2 ) )) && echo "Math logic works"
cat <<-"DELIM"
  This backslash \
  should not break the delimiter search.
DELIM
echo "Done."

LIMIT="EOF"
cat <<$LIMIT
  content
EOF