package parser

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	onuIDPattern = regexp.MustCompile(`^\d+(?:/\d+)*:\d+$`)
	macPattern   = regexp.MustCompile(`^(?i:[0-9a-f]{2}(?::[0-9a-f]{2}){5})$`)
)

func isLikelyONURecord(onuID string, mac string) bool {
	return onuIDPattern.MatchString(strings.TrimSpace(onuID)) &&
		macPattern.MatchString(strings.TrimSpace(mac))
}

// ONUResponse represents parsed ONU data from list endpoint
type ONUResponse struct {
	ONUID       string     `json:"onu_id"`
	Name        string     `json:"name"`
	MacAddress  string     `json:"mac_address"`
	Status      string     `json:"status"`
	FwVersion   string     `json:"fw_version"`
	ChipID      string     `json:"chip_id"`
	Ports       int        `json:"ports"`
	Distance    int        `json:"distance_meters"`
	CTCStatus   string     `json:"ctc_status"`
	CTCVersion  string     `json:"ctc_version"`
	IsActivated bool       `json:"is_activated"`
	Metrics     ONUMetrics `json:"metrics"`
}

// ONUMetrics contains optical module metrics
type ONUMetrics struct {
	Temperature float64 `json:"temperature"`
	Voltage     float64 `json:"voltage"`
	Current     float64 `json:"current"`
	TxPower     float64 `json:"tx_power"`
	RxPower     float64 `json:"rx_power"`
}

// ParseONUList parses /onuOverview.asp?oltponno=X
// Supported patterns:
// - var onutable=new Array(...);      // legacy format (16 fields/ONU)
// - var ponOnuTable=new Array(...);   // newer format (13 fields/ONU)
func (p *Parser) ParseONUList(html string) ([]ONUResponse, error) {
	type candidate struct {
		varName    string
		minFields  int
		parseChunk int
	}
	candidates := []candidate{
		{varName: "onutable", minFields: 16, parseChunk: 16},
		{varName: "onuTable", minFields: 16, parseChunk: 16},
		{varName: "ponOnuTable", minFields: 13, parseChunk: 13},
	}

	var best []ONUResponse
	var errs []error

	for _, c := range candidates {
		data, err := p.ExtractJSArray(html, c.varName)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		if len(data) < c.minFields {
			errs = append(errs, fmt.Errorf("variable '%s' has insufficient fields: %d", c.varName, len(data)))
			continue
		}

		var parsed []ONUResponse
		if c.parseChunk == 16 {
			parsed = p.parseONUList16(data)
		} else {
			parsed = p.parseONUList13(data)
		}

		if len(parsed) > len(best) {
			best = parsed
		}
	}

	if len(best) > 0 {
		return best, nil
	}
	if len(errs) > 0 {
		return nil, fmt.Errorf("unable to parse ONU list: %v", errs)
	}
	return nil, fmt.Errorf("unable to parse ONU list: unsupported payload format")
}

func (p *Parser) parseONUList16(data []string) []ONUResponse {
	var onus []ONUResponse
	for i := 0; i+15 < len(data); {
		if !isLikelyONURecord(data[i], data[i+2]) {
			i++
			continue
		}

		chunk := data[i : i+16]
		onus = append(onus, ONUResponse{
			ONUID:       chunk[0],
			Name:        chunk[1],
			MacAddress:  chunk[2],
			Status:      p.MapOnlineStatus(chunk[3]),
			FwVersion:   chunk[4],
			ChipID:      chunk[5],
			Ports:       p.ParseInt(chunk[6]),
			CTCStatus:   p.MapCTCStatus(chunk[7]),
			CTCVersion:  chunk[8],
			IsActivated: p.MapActivateStatus(chunk[9]),
			Distance:    p.CalculateDistance(chunk[10]),
			Metrics: ONUMetrics{
				Temperature: p.ParseFloat(chunk[11]),
				Voltage:     p.ParseFloat(chunk[12]),
				Current:     p.ParseFloat(chunk[13]),
				TxPower:     p.ParseFloat(chunk[14]),
				RxPower:     p.ParseFloat(chunk[15]),
			},
		})
		i += 16
	}
	return onus
}

func (p *Parser) parseONUList13(data []string) []ONUResponse {
	var onus []ONUResponse
	for i := 0; i+12 < len(data); {
		if !isLikelyONURecord(data[i], data[i+2]) {
			i++
			continue
		}

		chunk := data[i : i+13]
		onus = append(onus, ONUResponse{
			ONUID:      chunk[0],
			Name:       chunk[1],
			MacAddress: chunk[2],
			Status:     p.MapOnlineStatus(chunk[3]),
			FwVersion:  chunk[4],
			ChipID:     chunk[5],
			Ports:      p.ParseInt(chunk[6]),
			Distance:   p.ParseInt(chunk[12]),
			Metrics: ONUMetrics{
				Temperature: p.ParseFloat(chunk[7]),
				Voltage:     p.ParseFloat(chunk[8]),
				Current:     p.ParseFloat(chunk[9]),
				TxPower:     p.ParseFloat(chunk[10]),
				RxPower:     p.ParseFloat(chunk[11]),
			},
			// Fields not present in this format
			CTCStatus:   "",
			CTCVersion:  "",
			IsActivated: true,
		})
		i += 13
	}
	return onus
}

// ONUDetailResponse for detailed ONU info
type ONUDetailResponse struct {
	ONUID         string             `json:"onu_id"`
	Name          string             `json:"name"`
	MacAddress    string             `json:"mac_address"`
	Status        string             `json:"status"`
	FwVersion     string             `json:"fw_version"`
	ChipID        string             `json:"chip_id"`
	Ports         int                `json:"ports"`
	FirstUptime   string             `json:"first_uptime"`
	LastUptime    string             `json:"last_uptime"`
	LastOfftime   string             `json:"last_offtime"`
	IsActivated   bool               `json:"is_activated"`
	OpticalModule *OpticalModuleInfo `json:"optical_module,omitempty"`
}

// OpticalModuleInfo contains detailed optical module data
type OpticalModuleInfo struct {
	Temperature float64 `json:"temperature"`
	Voltage     float64 `json:"voltage"`
	BiasCurrent float64 `json:"bias_current"`
	TxPower     float64 `json:"tx_power"`
	RxPower     float64 `json:"rx_power"`
}

// ParseONUDetail parses /onuConfig.asp?onuno=X&oltponno=Y
// Pattern: var onuinfo=new Array(...); var onuOpmInfo=new Array(...);
func (p *Parser) ParseONUDetail(html string) (*ONUDetailResponse, error) {
	// Parse onuinfo array (legacy = 13 fields, newer = 7 fields)
	onuInfo, err := p.ExtractJSArray(html, "onuinfo")
	if err != nil {
		return nil, err
	}

	if len(onuInfo) < 7 {
		return nil, fmt.Errorf("incomplete onuinfo data: got %d fields, expected at least 7", len(onuInfo))
	}

	get := func(index int) string {
		if index < 0 || index >= len(onuInfo) {
			return ""
		}
		return onuInfo[index]
	}

	isActivated := true
	if len(onuInfo) > 12 {
		isActivated = p.MapActivateStatus(get(12))
	}

	detail := &ONUDetailResponse{
		ONUID:       get(0),
		Name:        get(1),
		MacAddress:  get(2),
		Status:      p.MapOnlineStatus(get(3)),
		FwVersion:   get(4),
		ChipID:      get(5),
		Ports:       p.ParseInt(get(6)),
		FirstUptime: get(7),
		LastUptime:  get(8),
		LastOfftime: get(9),
		IsActivated: isActivated,
	}

	// Parse onuOpmInfo array (6 fields) - optional
	onuOpm, err := p.ExtractJSArray(html, "onuOpmInfo")
	if err == nil && len(onuOpm) >= 6 {
		if onuOpm[0] != "" {
			detail.ONUID = onuOpm[0]
		}
		detail.OpticalModule = &OpticalModuleInfo{
			Temperature: p.ParseFloat(onuOpm[1]),
			Voltage:     p.ParseFloat(onuOpm[2]),
			BiasCurrent: p.ParseFloat(onuOpm[3]),
			TxPower:     p.ParseFloat(onuOpm[4]),
			RxPower:     p.ParseFloat(onuOpm[5]),
		}
	}

	return detail, nil
}
