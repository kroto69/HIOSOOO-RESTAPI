package scraper

import (
	"sync"
)

// WorkerPool manages a pool of goroutines for concurrent task execution
type WorkerPool struct {
	workers   int
	taskQueue chan func()
	wg        sync.WaitGroup
	closed    bool
	mu        sync.Mutex
}

// NewWorkerPool creates a new worker pool with specified number of workers
func NewWorkerPool(workers int) *WorkerPool {
	if workers <= 0 {
		workers = 10 // default
	}

	pool := &WorkerPool{
		workers:   workers,
		taskQueue: make(chan func(), workers*2), // buffered channel
	}

	// Start worker goroutines
	for i := 0; i < workers; i++ {
		go pool.worker()
	}

	return pool
}

// worker processes tasks from the queue
func (p *WorkerPool) worker() {
	for task := range p.taskQueue {
		task()
		p.wg.Done()
	}
}

// Submit adds a task to the queue
func (p *WorkerPool) Submit(task func()) {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return
	}
	p.mu.Unlock()

	p.wg.Add(1)
	p.taskQueue <- task
}

// Wait blocks until all submitted tasks are completed
func (p *WorkerPool) Wait() {
	p.wg.Wait()
}

// Close shuts down the worker pool
func (p *WorkerPool) Close() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if !p.closed {
		p.closed = true
		close(p.taskQueue)
	}
}

// BatchResult holds the result of a batch operation
type BatchResult[T any] struct {
	Index  int
	Result T
	Error  error
}

// BatchProcessor processes multiple items concurrently using a worker pool
type BatchProcessor[T any, R any] struct {
	pool *WorkerPool
}

// NewBatchProcessor creates a new batch processor
func NewBatchProcessor[T any, R any](workers int) *BatchProcessor[T, R] {
	return &BatchProcessor[T, R]{
		pool: NewWorkerPool(workers),
	}
}

// Process executes a function on each item concurrently and returns results
func (b *BatchProcessor[T, R]) Process(items []T, fn func(T) (R, error)) []BatchResult[R] {
	results := make([]BatchResult[R], len(items))
	var mu sync.Mutex

	for i, item := range items {
		idx := i
		itm := item
		b.pool.Submit(func() {
			result, err := fn(itm)
			mu.Lock()
			results[idx] = BatchResult[R]{
				Index:  idx,
				Result: result,
				Error:  err,
			}
			mu.Unlock()
		})
	}

	b.pool.Wait()
	return results
}

// Close shuts down the batch processor
func (b *BatchProcessor[T, R]) Close() {
	b.pool.Close()
}
