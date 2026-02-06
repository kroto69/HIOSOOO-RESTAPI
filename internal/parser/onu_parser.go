package parser

import "fmt"

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
// Pattern: var onutable=new Array(...);
// Chunk size: 16 fields per ONU
func (p *Parser) ParseONUList(html string) ([]ONUResponse, error) {
	data, err := p.ExtractJSArray(html, "onutable")
	if err != nil {
		return nil, err
	}

	chunks := p.ChunkArray(data, 16)

	var onus []ONUResponse
	for _, chunk := range chunks {
		if len(chunk) >= 16 {
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
		}
	}

	return onus, nil
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
	// Parse onuinfo array (13 fields)
	onuInfo, err := p.ExtractJSArray(html, "onuinfo")
	if err != nil {
		return nil, err
	}

	if len(onuInfo) < 13 {
		return nil, fmt.Errorf("incomplete onuinfo data: got %d fields, expected 13", len(onuInfo))
	}

	detail := &ONUDetailResponse{
		ONUID:       onuInfo[0],
		Name:        onuInfo[1],
		MacAddress:  onuInfo[2],
		Status:      p.MapOnlineStatus(onuInfo[3]),
		FwVersion:   onuInfo[4],
		ChipID:      onuInfo[5],
		Ports:       p.ParseInt(onuInfo[6]),
		FirstUptime: onuInfo[7],
		LastUptime:  onuInfo[8],
		LastOfftime: onuInfo[9],
		IsActivated: p.MapActivateStatus(onuInfo[12]),
	}

	// Parse onuOpmInfo array (6 fields) - optional
	onuOpm, err := p.ExtractJSArray(html, "onuOpmInfo")
	if err == nil && len(onuOpm) >= 6 {
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
