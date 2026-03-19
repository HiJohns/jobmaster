package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
)

type DispatchService struct {
	db *gorm.DB
}

func NewDispatchService(db *gorm.DB) *DispatchService {
	return &DispatchService{db: db}
}

type EngineerScore struct {
	EngineerID   uuid.UUID
	EngineerName string
	Score        float64
	Distance     float64
	CurrentLoad  int
}

type DispatchRecommendation struct {
	Engineer EngineerScore
	Reason   string
}

func (s *DispatchService) GetRecommendations(orderID uuid.UUID, limit int) ([]DispatchRecommendation, error) {
	var order model.WorkOrder
	if err := s.db.First(&order, "id = ?", orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	var engineers []model.User
	if err := s.db.Where("role = ?", model.UserRoleEngineer).Find(&engineers).Error; err != nil {
		return nil, err
	}

	var recommendations []DispatchRecommendation
	for _, engineer := range engineers {
		currentLoad := s.getCurrentLoad(engineer.ID)
		distance := s.calculateDistance(order.StoreID, engineer.OrganizationID)
		score := calculateScore(distance, currentLoad)

		recommendations = append(recommendations, DispatchRecommendation{
			Engineer: EngineerScore{
				EngineerID:   engineer.ID,
				EngineerName: engineer.DisplayName,
				Score:        score,
				Distance:     distance,
				CurrentLoad:  currentLoad,
			},
			Reason: fmt.Sprintf("Score: %.2f, Distance: %.2fkm, Current Jobs: %d", score, distance, currentLoad),
		})
	}

	for i := 0; i < len(recommendations)-1; i++ {
		for j := i + 1; j < len(recommendations); j++ {
			if recommendations[j].Engineer.Score > recommendations[i].Engineer.Score {
				recommendations[i], recommendations[j] = recommendations[j], recommendations[i]
			}
		}
	}

	if len(recommendations) > limit {
		recommendations = recommendations[:limit]
	}

	return recommendations, nil
}

func (s *DispatchService) getCurrentLoad(engineerID uuid.UUID) int {
	var count int64
	s.db.Model(&model.WorkOrder{}).Where(
		"engineer_id = ? AND status NOT IN ?",
		engineerID,
		[]model.WorkOrderStatus{model.WorkOrderStatusClosed, model.WorkOrderStatusObserving},
	).Count(&count)
	return int(count)
}

func (s *DispatchService) calculateDistance(fromOrgID, toOrgID uuid.UUID) float64 {
	return 0
}

func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	return 0
}

func calculateScore(distance float64, currentLoad int) float64 {
	distanceWeight := 0.4
	loadWeight := 0.6

	distanceScore := distance * 10
	if distanceScore > 100 {
		distanceScore = 100
	}
	loadScore := float64(currentLoad * 20)
	if loadScore > 100 {
		loadScore = 100
	}

	return distanceScore*distanceWeight + loadScore*loadWeight
}
