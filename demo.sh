#!/bin/bash

# ANSI Color Codes for terminal formatting
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    set -a; source .env; set +a
else
    echo "Error: .env file not found."
    exit 1
fi

echo -e "--- [1/5] INITIAL DATABASE STATE ---"
CMD="docker exec -i prisma-mysql-cms mysql -u root -p\"\$DOCKER_DB_PASS\" -t -e \"SELECT id, email, name FROM cms.User;\""
echo -e "${CYAN}Executing:${NC} $CMD"
eval "$CMD"

echo -e "\n--- [2/5] AUTHENTICATION HANDSHAKE/LOGIN ---"
# Using a heredoc-style variable for complex curl strings
CURL_LOGIN="curl -s -X POST http://localhost:3000/api/auth/login \\
     -H \"Content-Type: application/json\" \\
     -d '{\"email\": \"admin@example.com\", \"password\": \"1234\"}'"

echo -e "${CYAN}Executing:${NC} $CURL_LOGIN"
TOKEN=$(eval "$CURL_LOGIN" | jq -r .token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Authentication failed."
    exit 1
fi
echo -e "$TOKEN"

echo -e "\n--- [3/5] GET WITH TOKEN ---"
CURL_GET="curl -s -G http://localhost:3000/api/questions \\
     -H \"Authorization: Bearer \$TOKEN\" \\
     --data-urlencode \"keyword=bakery\""

echo -e "${CYAN}Executing:${NC} $CURL_GET"
eval "$CURL_GET" | jq

echo -e "\n--- [4/5] INTERACTIVE USER REGISTRATION (POST) ---"
read -p "Enter registration email: " REG_EMAIL
read -p "Enter user name: " REG_NAME

CURL_POST="curl -s -X POST http://localhost:3000/api/auth/register \\
     -H \"Content-Type: application/json\" \\
     -d '{
       \"email\": \"$REG_EMAIL\",
       \"password\": \"haxor\",
       \"name\": \"$REG_NAME\"
     }'"

echo -e "${CYAN}Executing:${NC} $CURL_POST"
eval "$CURL_POST" | jq

echo -e "\n--- [5/5] FINAL DATABASE STATE ---"
CMD_FINAL="docker exec -i prisma-mysql-cms mysql -u root -p\"\$DOCKER_DB_PASS\" -t -e \"SELECT id, email, name FROM cms.User;\""
echo -e "${CYAN}Executing:${NC} $CMD_FINAL"
eval "$CMD_FINAL"
