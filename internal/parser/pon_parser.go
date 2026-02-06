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

	var pons []PONResponse
	for _, chunk := range chunks {
		if len(chunk) >= 2 {
			fullID := chunk[0]
			// Extract simplified ID: "0/1" -> "1"
			simplifiedID := fullID
			if parts := strings.Split(fullID, "/"); len(parts) == 2 {
				simplifiedID = parts[1]
			}
			pons = append(pons, PONResponse{
				PONID:  simplifiedID,
				FullID: fullID,
				Info:   chunk[1],
			})
		}
	}

	return pons, nil
}
