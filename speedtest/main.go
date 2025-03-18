package main

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"net"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// 测试结果结构
type TestResult struct {
	IP    string
	Delay float64
}

// 进度统计
type Progress struct {
	total     int32
	current   int32
	success   int32
	lastCount int32
	lastTime  time.Time
}

func (p *Progress) Print() {
	current := atomic.LoadInt32(&p.current)
	total := atomic.LoadInt32(&p.total)
	success := atomic.LoadInt32(&p.success)
	
	now := time.Now()
	duration := now.Sub(p.lastTime).Seconds()
	if duration >= 1 { // 每秒更新一次速度
		speed := float64(current - p.lastCount) / duration
		p.lastCount = current
		p.lastTime = now
		
		fmt.Printf("\r进度: %.1f%% (%d/%d) 可用: %d 速度: %.1f IP/s", 
			float64(current)/float64(total)*100, 
			current, 
			total,
			success,
			speed,
		)
	}
}

// 测试单个IP的TLS连接
func testTLS(ip string, timeout time.Duration) float64 {
	startTime := time.Now()
	
	// 设置TLS配置
	conf := &tls.Config{
		InsecureSkipVerify: true,
		MinVersion:         tls.VersionTLS10,
		MaxVersion:         tls.VersionTLS13,
	}

	// 建立TCP连接
	dialer := &net.Dialer{Timeout: timeout}
	conn, err := dialer.Dial("tcp", fmt.Sprintf("%s:443", ip))
	if err != nil {
		return -1
	}
	defer conn.Close()

	// 升级到TLS连接
	tlsConn := tls.Client(conn, conf)
	err = tlsConn.SetDeadline(time.Now().Add(timeout))
	if err != nil {
		return -1
	}

	// 尝试TLS握手
	err = tlsConn.Handshake()
	if err != nil {
		return -1
	}

	delay := time.Since(startTime).Seconds() * 1000
	if delay > 1000 {
		return -1
	}
	return delay
}

func main() {
	// 读取IP列表
	file, err := os.Open("ip.txt")
	if err != nil {
		fmt.Println("无法打开ip.txt文件:", err)
		return
	}
	defer file.Close()

	var ips []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		ips = append(ips, scanner.Text())
	}

	fmt.Printf("\n[说明]\n")
	fmt.Printf("测试 443 端口 TLS 连接质量\n")
	fmt.Printf("\n[配置]\n")
	fmt.Printf("端口: 443 (TLS)\n")
	fmt.Printf("并发: 2000\n")
	fmt.Printf("超时: 1秒\n\n")
	fmt.Printf("总共读取到 %d 个IP\n\n", len(ips))

	// 创建结果通道和等待组
	resultChan := make(chan TestResult, len(ips))
	var wg sync.WaitGroup
	
	// 创建进度统计
	progress := &Progress{
		total:     int32(len(ips)),
		lastCount: 0,
		lastTime:  time.Now(),
	}

	// 限制并发数
	tokens := make(chan struct{}, 2000)

	// 开始测试
	startTime := time.Now()

	for _, ip := range ips {
		wg.Add(1)
		tokens <- struct{}{} // 获取令牌

		go func(ip string) {
			defer func() {
				<-tokens // 释放令牌
				wg.Done()
				atomic.AddInt32(&progress.current, 1)
				progress.Print()
			}()

			delay := testTLS(ip, time.Second)
			if delay > 0 {
				atomic.AddInt32(&progress.success, 1)
				resultChan <- TestResult{IP: ip, Delay: delay}
			}
		}(ip)
	}

	// 等待所有测试完成
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// 收集结果
	var results []TestResult
	for result := range resultChan {
		results = append(results, result)
	}

	// 按延迟排序
	sort.Slice(results, func(i, j int) bool {
		return results[i].Delay < results[j].Delay
	})

	// 保存结果
	outFile, err := os.Create("test_results.txt")
	if err != nil {
		fmt.Println("无法创建结果文件:", err)
		return
	}
	defer outFile.Close()

	writer := bufio.NewWriter(outFile)
	writer.WriteString("IP地址\t\tTLS延迟\t状态\n")
	writer.WriteString("----------------------------------------\n")
	for _, result := range results {
		writer.WriteString(fmt.Sprintf("%-20s %.1fms\t可用\n", result.IP, result.Delay))
	}
	writer.Flush()

	fmt.Printf("\n\n测试完成! 找到 %d 个可用IP\n", len(results))
	fmt.Printf("结果已保存到 test_results.txt\n\n")

	fmt.Println("延迟最低的10个可用IP:")
	fmt.Println("----------------------------------------")
	fmt.Println("IP地址\t\tTLS延迟\t状态")
	fmt.Println("----------------------------------------")
	for i := 0; i < min(10, len(results)); i++ {
		fmt.Printf("%-20s %.1fms\t可用\n", results[i].IP, results[i].Delay)
	}

	fmt.Printf("\n总耗时: %.1f秒\n", time.Since(startTime).Seconds())
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
} 
