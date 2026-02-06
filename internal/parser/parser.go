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
	pattern := fmt.Sprintf(`var\s+%s\s*=\s*new\s+Array\s*\(([\s\S]*?)\);`, regexp.QuoteMeta(varName))
	re := regexp.MustCompile(pattern)

	matches := re.FindStringSubmatch(html)
	if len(matches) < 2 {
		return nil, fmt.Errorf("variable '%s' not found in HTML", varName)
	}

	return p.parseArrayContent(matches[1]), nil
}

// parseArrayContent parses the content inside Array()
func (p *Parser) parseArrayContent(content string) []string {
	// Remove newlines, comments, and whitespace
	content = regexp.MustCompile(`//.*`).ReplaceAllString(content, "")
	content = regexp.MustCompile(`\s+`).ReplaceAllString(content, " ")
	content = strings.TrimSpace(content)

	// Extract quoted strings (single or double quotes)
	re := regexp.MustCompile(`'([^']*)'|"([^"]*)"`)
	matches := re.FindAllStringSubmatch(content, -1)

	var values []string
	for _, match := range matches {
		if match[1] != "" {
			values = append(values, match[1])
		} else if match[2] != "" {
			values = append(values, match[2])
		}
	}

	return values
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
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// ParseInt safely converts string to int
func (p *Parser) ParseInt(s string) int {
	s = strings.TrimSpace(s)
	if s == "" || s == "N/A" || s == "--" {
		return 0
	}
	i, _ := strconv.Atoi(s)
	return i
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
	statusMap := map[string]string{
		"0": "offline",
		"1": "online",
		"2": "poweroff",
	}
	if s, ok := statusMap[status]; ok {
		return s
	}
	return status
}
