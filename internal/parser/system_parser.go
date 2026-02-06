package parser

import "fmt"

// SystemInfoResponse represents parsed system information
type SystemInfoResponse struct {
	SystemName        string  `json:"system_name"`
	SystemDescription string  `json:"system_description"`
	SystemLocation    string  `json:"system_location"`
	SwitchType        string  `json:"switch_type"`
	SoftwareVersion   string  `json:"software_version"`
	Revision          string  `json:"revision"`
	MACAddress        string  `json:"mac_address"`
	IPAddress         string  `json:"ip_address"`
	RunTime           string  `json:"run_time"`
	HardwareVersion   string  `json:"hardware_version"`
	SerialNumber      string  `json:"serial_number"`
	CPUUsage          float64 `json:"cpu_usage"`
	MemoryUsage       float64 `json:"memory_usage"`
}

// ParseSystemInfo parses /system.asp
// Pattern: var sysInfo = new Array("EPON","waru","Unknown","OLT","V2.3.1",...);
// Fields: SystemName, Description, Location, SwitchType, SoftwareVersion, Revision,
//
//	MACAddress, IPAddress, RunTime, HardwareVersion, SN, CPUUsage, MemoryUsage
func (p *Parser) ParseSystemInfo(html string) (*SystemInfoResponse, error) {
	data, err := p.ExtractJSArray(html, "sysInfo")
	if err != nil {
		return nil, err
	}

	if len(data) < 13 {
		return nil, fmt.Errorf("incomplete sysInfo data: got %d fields, expected 13", len(data))
	}

	return &SystemInfoResponse{
		SystemName:        data[0],
		SystemDescription: data[1],
		SystemLocation:    data[2],
		SwitchType:        data[3],
		SoftwareVersion:   data[4],
		Revision:          data[5],
		MACAddress:        data[6],
		IPAddress:         data[7],
		RunTime:           data[8],
		HardwareVersion:   data[9],
		SerialNumber:      data[10],
		CPUUsage:          p.ParseFloat(data[11]),
		MemoryUsage:       p.ParseFloat(data[12]),
	}, nil
}
