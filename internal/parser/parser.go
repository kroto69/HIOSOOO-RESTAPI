package parser

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Parser handles HTML parsing and JavaScript array extraction
type Parser struct{}

// NewParser creates a new Parser instance
func NewParser() *Parser {
	return &Parser{}
}

// ExtractJSArray extracts JavaScript array by variable name from HTML
// Example: var ponListTable=new Array('0/1','N/A','0/2','N/A');
func (p *Parser) ExtractJSArray(html, varName string) ([]string, error) {
	pattern := fmt.Sprintf(`var\s+%s\s*=\s*new\s+Array\s*\(`, regexp.QuoteMeta(varName))
	re := regexp.MustCompile(pattern)

	loc := re.FindStringIndex(html)
	if len(loc) < 2 {
		return nil, fmt.Errorf("variable '%s' not found in HTML", varName)
	}

	start := loc[1] // index right after opening "("
	end, err := findMatchingParen(html, start)
	if err != nil {
		return nil, fmt.Errorf("failed to parse variable '%s': %w", varName, err)
	}

	return p.parseArrayContent(html[start:end]), nil
}

// parseArrayContent parses the content inside Array()
func (p *Parser) parseArrayContent(content string) []string {
	content = stripLineComments(content)
	content = strings.TrimSpace(content)
	if content == "" {
		return nil
	}

	values := make([]string, 0, 64)
	var token strings.Builder
	inSingle := false
	inDouble := false
	escaped := false
	tokenWasQuoted := false

	flush := func() {
		raw := strings.TrimSpace(token.String())
		token.Reset()
		defer func() { tokenWasQuoted = false }()

		if raw == "" && !tokenWasQuoted {
			return
		}
		if raw == "null" || raw == "undefined" {
			values = append(values, "")
			return
		}
		values = append(values, raw)
	}

	for i := 0; i < len(content); i++ {
		ch := content[i]

		if escaped {
			token.WriteByte(ch)
			escaped = false
			continue
		}

		if inSingle || inDouble {
			if ch == '\\' {
				escaped = true
				continue
			}
			if inSingle && ch == '\'' {
				inSingle = false
				continue
			}
			if inDouble && ch == '"' {
				inDouble = false
				continue
			}
			token.WriteByte(ch)
			continue
		}

		switch ch {
		case '\'':
			inSingle = true
			tokenWasQuoted = true
		case '"':
			inDouble = true
			tokenWasQuoted = true
		case ',':
			flush()
		default:
			token.WriteByte(ch)
		}
	}
	flush()

	return values
}

func stripLineComments(input string) string {
	if input == "" {
		return input
	}

	var b strings.Builder
	b.Grow(len(input))

	inSingle := false
	inDouble := false
	escaped := false

	for i := 0; i < len(input); i++ {
		ch := input[i]

		if escaped {
			b.WriteByte(ch)
			escaped = false
			continue
		}

		if ch == '\\' && (inSingle || inDouble) {
			b.WriteByte(ch)
			escaped = true
			continue
		}

		if inSingle {
			b.WriteByte(ch)
			if ch == '\'' {
				inSingle = false
			}
			continue
		}

		if inDouble {
			b.WriteByte(ch)
			if ch == '"' {
				inDouble = false
			}
			continue
		}

		if ch == '\'' {
			inSingle = true
			b.WriteByte(ch)
			continue
		}
		if ch == '"' {
			inDouble = true
			b.WriteByte(ch)
			continue
		}

		// Strip JS line comments outside quoted strings.
		if ch == '/' && i+1 < len(input) && input[i+1] == '/' {
			for i < len(input) && input[i] != '\n' {
				i++
			}
			if i < len(input) {
				b.WriteByte('\n')
			}
			continue
		}

		b.WriteByte(ch)
	}

	return b.String()
}

func findMatchingParen(input string, start int) (int, error) {
	if start <= 0 || start > len(input) {
		return -1, fmt.Errorf("invalid start index")
	}

	depth := 1
	inSingle := false
	inDouble := false
	escaped := false

	for i := start; i < len(input); i++ {
		ch := input[i]

		if escaped {
			escaped = false
			continue
		}

		if ch == '\\' && (inSingle || inDouble) {
			escaped = true
			continue
		}

		if inSingle {
			if ch == '\'' {
				inSingle = false
			}
			continue
		}

		if inDouble {
			if ch == '"' {
				inDouble = false
			}
			continue
		}

		switch ch {
		case '\'':
			inSingle = true
		case '"':
			inDouble = true
		case '(':
			depth++
		case ')':
			depth--
			if depth == 0 {
				return i, nil
			}
		}
	}

	return -1, fmt.Errorf("matching ')' not found")
}

// ChunkArray splits an array into chunks of specified size
func (p *Parser) ChunkArray(data []string, size int) [][]string {
	if size <= 0 {
		return nil
	}

	var chunks [][]string
	for i := 0; i < len(data); i += size {
		end := i + size
		if end > len(data) {
			end = len(data)
		}
		chunks = append(chunks, data[i:end])
	}
	return chunks
}

// ParseFloat safely converts string to float64
func (p *Parser) ParseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "N/A" || s == "--" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", "")
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// ParseInt safely converts string to int
func (p *Parser) ParseInt(s string) int {
	s = strings.TrimSpace(s)
	if s == "" || s == "N/A" || s == "--" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", "")
	i, _ := strconv.Atoi(s)
	return i
}

// ParseUint64 safely converts counter-like values to uint64.
func (p *Parser) ParseUint64(s string) uint64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "N/A" || s == "--" {
		return 0
	}
	s = strings.ReplaceAll(s, ",", "")
	v, _ := strconv.ParseUint(s, 10, 64)
	return v
}

// CalculateDistance converts raw distance value to meters
// Formula: (raw * 1.6393 - 157)
func (p *Parser) CalculateDistance(raw string) int {
	rawFloat := p.ParseFloat(raw)
	if rawFloat == 0 {
		return 0
	}

	distance := rawFloat*1.6393 - 157
	if distance > 157 {
		distance = distance - 157
	} else if distance <= 0 {
		distance = 1
	}
	return int(distance)
}

// MapCTCStatus converts numeric code to status string
func (p *Parser) MapCTCStatus(code string) string {
	statusMap := map[string]string{
		"0": "--",
		"1": "MpcpDiscovery",
		"2": "MpcpSla",
		"3": "CtcInfo",
		"4": "RequestCfg",
		"5": "CtcNegDone",
	}
	if status, ok := statusMap[code]; ok {
		return status
	}
	return "unknown"
}

// MapActivateStatus converts numeric code to boolean
// "2" = Deactivate, others = Activate
func (p *Parser) MapActivateStatus(code string) bool {
	return code != "2"
}

// MapOnlineStatus converts status code to human-readable string
func (p *Parser) MapOnlineStatus(status string) string {
	normalized := strings.ToLower(strings.TrimSpace(status))

	statusMap := map[string]string{
		"0":        "offline",
		"1":        "online",
		"2":        "poweroff",
		"up":       "online",
		"online":   "online",
		"down":     "down",
		"offline":  "offline",
		"los":      "los",
		"poweroff": "poweroff",
		"powerdown": "powerdown",
	}
	if s, ok := statusMap[normalized]; ok {
		return s
	}
	if normalized == "" {
		return "unknown"
	}
	return normalized
}
