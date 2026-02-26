package parser

import "fmt"

// ONUTrafficResponse represents parsed ONU traffic counters.
type ONUTrafficResponse struct {
	PortID      string `json:"port_id"`
	RxBytes     uint64 `json:"rx_bytes"`
	RxUnicast   uint64 `json:"rx_unicast"`
	RxBroadcast uint64 `json:"rx_broadcast"`
	RxMulticast uint64 `json:"rx_multicast"`
	RxError     uint64 `json:"rx_error"`
	TxBytes     uint64 `json:"tx_bytes"`
	TxUnicast   uint64 `json:"tx_unicast"`
	TxBroadcast uint64 `json:"tx_broadcast"`
	TxMulticast uint64 `json:"tx_multicast"`
	TxError     uint64 `json:"tx_error"`
}

// ParseONUTraffic parses /onuLlidStatistic.asp response.
// Pattern: var portCounters=new Array("0/1:1","64,421,190",...);
func (p *Parser) ParseONUTraffic(html string) (*ONUTrafficResponse, error) {
	data, err := p.ExtractJSArray(html, "portCounters")
	if err != nil {
		return nil, err
	}
	if len(data) < 11 {
		return nil, fmt.Errorf("incomplete portCounters data: got %d fields, expected 11", len(data))
	}

	return &ONUTrafficResponse{
		PortID:      data[0],
		RxBytes:     p.ParseUint64(data[1]),
		RxUnicast:   p.ParseUint64(data[2]),
		RxBroadcast: p.ParseUint64(data[3]),
		RxMulticast: p.ParseUint64(data[4]),
		RxError:     p.ParseUint64(data[5]),
		TxBytes:     p.ParseUint64(data[6]),
		TxUnicast:   p.ParseUint64(data[7]),
		TxBroadcast: p.ParseUint64(data[8]),
		TxMulticast: p.ParseUint64(data[9]),
		TxError:     p.ParseUint64(data[10]),
	}, nil
}

