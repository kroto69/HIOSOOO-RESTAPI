package parser

import "strings"

// PONResponse represents parsed PON list data
type PONResponse struct {
	PONID  string `json:"pon_id"`
	FullID string `json:"full_id"` // Original format (e.g., "0/1")
	Info   string `json:"info"`
}

// ParsePONList parses /onuOverviewPonList.asp
// Pattern: var ponListTable=new Array('0/1','N/A','0/2','N/A');
// Chunk size: 2 (pon_id, info)
func (p *Parser) ParsePONList(html string) ([]PONResponse, error) {
	data, err := p.ExtractJSArray(html, "ponListTable")
	if err != nil {
		return nil, err
	}

	chunks := p.ChunkArray(data, 2)
	type rawPON struct {
		fullID string
		info   string
		depth  int
	}
	var raws []rawPON
	depthCount := map[int]int{}
	for _, chunk := range chunks {
		if len(chunk) >= 2 {
			fullID := chunk[0]
			parts := strings.Split(fullID, "/")
			if len(parts) < 2 {
				continue
			}
			depth := len(parts)
			depthCount[depth]++
			raws = append(raws, rawPON{
				fullID: fullID,
				info:   chunk[1],
				depth:  depth,
			})
		}
	}

	if len(raws) == 0 {
		return []PONResponse{}, nil
	}

	// Pick one PON style to avoid mixed tabs like 0/1 and 0/1/1 simultaneously.
	targetDepth := 0
	targetCount := 0
	for depth, count := range depthCount {
		if count > targetCount || (count == targetCount && (targetDepth == 0 || depth < targetDepth)) {
			targetDepth = depth
			targetCount = count
		}
	}

	seen := map[string]bool{}
	pons := make([]PONResponse, 0, len(raws))
	for _, raw := range raws {
		if raw.depth != targetDepth {
			continue
		}
		if seen[raw.fullID] {
			continue
		}
		seen[raw.fullID] = true

		simplifiedID := raw.fullID
		if parts := strings.Split(raw.fullID, "/"); len(parts) == 2 {
			simplifiedID = parts[1]
		}
		pons = append(pons, PONResponse{
			PONID:  simplifiedID,
			FullID: raw.fullID,
			Info:   raw.info,
		})
	}

	return pons, nil
}
