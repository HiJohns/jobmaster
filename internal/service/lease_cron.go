package service

import (
	"log"
	"time"

	"gorm.io/gorm"
	"jobmaster/internal/model"
)

type LeaseCronService struct {
	db *gorm.DB
}

func NewLeaseCronService(db *gorm.DB) *LeaseCronService {
	return &LeaseCronService{db: db}
}

func (s *LeaseCronService) Start() error {
	go s.runDailyCheck()
	log.Println("[LeaseCron] Started daily lease progress checker")
	return nil
}

func (s *LeaseCronService) runDailyCheck() {
	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
		duration := next.Sub(now)

		time.Sleep(duration)
		s.checkLeaseProgress()
	}
}

func (s *LeaseCronService) checkLeaseProgress() {
	log.Println("[LeaseCron] Checking lease progress...")

	var progressRecords []model.UserAssetProgress
	if err := s.db.Where("completed_at IS NULL").Find(&progressRecords).Error; err != nil {
		log.Printf("[LeaseCron] Failed to fetch progress records: %v", err)
		return
	}

	for _, record := range progressRecords {
		remaining := 12 - record.PaidMonths
		if remaining > 0 && remaining <= 3 {
			s.sendOwnershipReminder(record)
		}
	}

	log.Printf("[LeaseCron] Checked %d lease progress records", len(progressRecords))
}

func (s *LeaseCronService) sendOwnershipReminder(record model.UserAssetProgress) {
	log.Printf("[LeaseCron] Sending ownership reminder for user %s, device %s: %d months remaining",
		record.UserID, record.DeviceID, 12-record.PaidMonths)
}

func (s *LeaseCronService) RunOnce() error {
	s.checkLeaseProgress()
	return nil
}
