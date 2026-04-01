package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing IoT device authentication
type SmartContract struct {
	contractapi.Contract
}

// Device represents a registered IoT device
type Device struct {
	DeviceID         string `json:"device_id"`
	PublicKey        string `json:"public_key"`
	Registered       bool   `json:"registered"`
	RegistrationTime int64  `json:"registration_time"`
	Active           bool   `json:"active"`
	LastAuthTime     int64  `json:"last_auth_time"`
}

// AuthEvent represents a successful authentication event
type AuthEvent struct {
	EventID     string `json:"event_id"`
	DeviceID    string `json:"device_id"`
	Timestamp   int64  `json:"timestamp"`
	MessageHash string `json:"message_hash"`
	Status      string `json:"status"` // SUCCESS, REPLAY, FAILED
	Nonce       string `json:"nonce"`
}

// NonceRecord prevents replay attacks
type NonceRecord struct {
	Nonce     string `json:"nonce"`
	DeviceID  string `json:"device_id"`
	Timestamp int64  `json:"timestamp"`
	Expiry    int64  `json:"expiry"` // 60 second replay window
}

// Asset keeps compatibility with asset-transfer-basic flows used by scripts/checkers.
type Asset struct {
	ID             string `json:"ID"`
	Color          string `json:"Color"`
	Size           int    `json:"Size"`
	Owner          string `json:"Owner"`
	AppraisedValue int    `json:"AppraisedValue"`
}

const maxReplayWindow = 60 // seconds

// InitLedger seeds demo assets for compatibility with existing test flow.
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{ID: "asset1", Color: "blue", Size: 5, Owner: "Tomoko", AppraisedValue: 300},
		{ID: "asset2", Color: "red", Size: 5, Owner: "Brad", AppraisedValue: 400},
		{ID: "asset3", Color: "green", Size: 10, Owner: "Jin Soo", AppraisedValue: 500},
		{ID: "asset4", Color: "yellow", Size: 10, Owner: "Max", AppraisedValue: 600},
		{ID: "asset5", Color: "black", Size: 15, Owner: "Adriana", AppraisedValue: 700},
		{ID: "asset6", Color: "white", Size: 15, Owner: "Michel", AppraisedValue: 800},
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		if err := ctx.GetStub().PutState(asset.ID, assetJSON); err != nil {
			return err
		}
	}

	return nil
}

// CreateAsset creates or updates an asset record.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, color string, size int, owner string, appraisedValue int) error {
	asset := Asset{
		ID:             id,
		Color:          color,
		Size:           size,
		Owner:          owner,
		AppraisedValue: appraisedValue,
	}

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// ReadAsset returns a single asset by ID.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	if err := json.Unmarshal(assetJSON, &asset); err != nil {
		return nil, err
	}

	return &asset, nil
}

// GetAllAssets returns all key/value states that decode as Asset.
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		if err := json.Unmarshal(queryResponse.Value, &asset); err != nil {
			continue
		}

		if asset.ID == "" {
			continue
		}

		assets = append(assets, &asset)
	}

	return assets, nil
}

// RegisterDevice registers a new IoT device
func (s *SmartContract) RegisterDevice(ctx contractapi.TransactionContextInterface, deviceID string, publicKey string) error {

	existing, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return fmt.Errorf("error checking existing device: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("device %s already registered", deviceID)
	}

	device := Device{
		DeviceID:         deviceID,
		PublicKey:        publicKey,
		Registered:       true,
		RegistrationTime: time.Now().Unix(),
		Active:           true,
		LastAuthTime:     0,
	}

	deviceBytes, err := json.Marshal(device)
	if err != nil {
		return fmt.Errorf("error marshalling device: %v", err)
	}

	err = ctx.GetStub().PutState(deviceID, deviceBytes)
	if err != nil {
		return fmt.Errorf("error storing device: %v", err)
	}

	// Emit event for device registration
	err = ctx.GetStub().SetEvent("DeviceRegistered", deviceBytes)
	if err != nil {
		return fmt.Errorf("error emitting event: %v", err)
	}

	return nil
}

// VerifyAuthentication verifies IoT device authentication using HMAC-SHA256
func (s *SmartContract) VerifyAuthentication(ctx contractapi.TransactionContextInterface, deviceID string, message string, timestamp string, nonce string, hmacSignature string) error {

	// 1. Check device exists and is active
	deviceBytes, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return fmt.Errorf("error retrieving device: %v", err)
	}
	if deviceBytes == nil {
		eventBytes, _ := json.Marshal(AuthEvent{
			EventID:   fmt.Sprintf("auth-fail-%s-%d", deviceID, time.Now().Unix()),
			DeviceID:  deviceID,
			Timestamp: time.Now().Unix(),
			Status:    "FAILED",
			Nonce:     nonce,
		})
		ctx.GetStub().SetEvent("AuthenticationFailed", eventBytes)
		return fmt.Errorf("device %s not registered", deviceID)
	}

	var device Device
	err = json.Unmarshal(deviceBytes, &device)
	if err != nil {
		return fmt.Errorf("error unmarshalling device: %v", err)
	}

	if !device.Active {
		return fmt.Errorf("device %s is not active", deviceID)
	}

	// 2. Check timestamp is recent (within 60 seconds)
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid timestamp format: %v", err)
	}

	now := time.Now().Unix()
	if now-ts > maxReplayWindow || ts-now > maxReplayWindow {
		eventBytes, _ := json.Marshal(AuthEvent{
			EventID:   fmt.Sprintf("auth-stale-%s-%d", deviceID, now),
			DeviceID:  deviceID,
			Timestamp: now,
			Status:    "FAILED",
			Nonce:     nonce,
		})
		ctx.GetStub().SetEvent("AuthenticationFailed", eventBytes)
		return fmt.Errorf("timestamp outside valid window")
	}

	// 3. Check nonce has not been replayed
	nonceKey := fmt.Sprintf("nonce-%s-%s", deviceID, nonce)
	existingNonce, err := ctx.GetStub().GetState(nonceKey)
	if err != nil {
		return fmt.Errorf("error checking nonce: %v", err)
	}

	if existingNonce != nil {
		eventBytes, _ := json.Marshal(AuthEvent{
			EventID:   fmt.Sprintf("auth-replay-%s-%d", deviceID, now),
			DeviceID:  deviceID,
			Timestamp: now,
			Status:    "REPLAY",
			Nonce:     nonce,
		})
		ctx.GetStub().SetEvent("ReplayAttackDetected", eventBytes)
		return fmt.Errorf("nonce replay detected for device %s", deviceID)
	}

	// 4. Verify HMAC signature
	payload := message + timestamp + nonce
	expectedHMAC := calculateHMAC(device.PublicKey, payload)

	if expectedHMAC != hmacSignature {
		eventBytes, _ := json.Marshal(AuthEvent{
			EventID:   fmt.Sprintf("auth-hmac-fail-%s-%d", deviceID, now),
			DeviceID:  deviceID,
			Timestamp: now,
			Status:    "FAILED",
			Nonce:     nonce,
		})
		ctx.GetStub().SetEvent("AuthenticationFailed", eventBytes)
		return fmt.Errorf("HMAC verification failed for device %s", deviceID)
	}

	// 5. Record nonce to prevent replay
	nonceRecord := NonceRecord{
		Nonce:     nonce,
		DeviceID:  deviceID,
		Timestamp: ts,
		Expiry:    ts + maxReplayWindow,
	}

	nonceBytes, err := json.Marshal(nonceRecord)
	if err != nil {
		return fmt.Errorf("error marshalling nonce: %v", err)
	}

	err = ctx.GetStub().PutState(nonceKey, nonceBytes)
	if err != nil {
		return fmt.Errorf("error storing nonce: %v", err)
	}

	// 6. Update device last auth time
	device.LastAuthTime = now
	deviceBytes, err = json.Marshal(device)
	if err != nil {
		return fmt.Errorf("error marshalling updated device: %v", err)
	}

	err = ctx.GetStub().PutState(deviceID, deviceBytes)
	if err != nil {
		return fmt.Errorf("error updating device: %v", err)
	}

	// 7. Log successful authentication
	authEvent := AuthEvent{
		EventID:     fmt.Sprintf("auth-success-%s-%d", deviceID, now),
		DeviceID:    deviceID,
		Timestamp:   now,
		MessageHash: calculateSHA256(payload),
		Status:      "SUCCESS",
		Nonce:       nonce,
	}

	authBytes, err := json.Marshal(authEvent)
	if err != nil {
		return fmt.Errorf("error marshalling auth event: %v", err)
	}

	err = ctx.GetStub().PutState(authEvent.EventID, authBytes)
	if err != nil {
		return fmt.Errorf("error storing auth event: %v", err)
	}

	err = ctx.GetStub().SetEvent("AuthenticationSuccess", authBytes)
	if err != nil {
		return fmt.Errorf("error emitting success event: %v", err)
	}

	return nil
}

// RevokeDevice deactivates a device
func (s *SmartContract) RevokeDevice(ctx contractapi.TransactionContextInterface, deviceID string) error {

	deviceBytes, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return fmt.Errorf("error retrieving device: %v", err)
	}
	if deviceBytes == nil {
		return fmt.Errorf("device %s not found", deviceID)
	}

	var device Device
	err = json.Unmarshal(deviceBytes, &device)
	if err != nil {
		return fmt.Errorf("error unmarshalling device: %v", err)
	}

	device.Active = false
	updatedBytes, err := json.Marshal(device)
	if err != nil {
		return fmt.Errorf("error marshalling device: %v", err)
	}

	err = ctx.GetStub().PutState(deviceID, updatedBytes)
	if err != nil {
		return fmt.Errorf("error updating device: %v", err)
	}

	return nil
}

// GetDevice retrieves device information
func (s *SmartContract) GetDevice(ctx contractapi.TransactionContextInterface, deviceID string) (*Device, error) {

	deviceBytes, err := ctx.GetStub().GetState(deviceID)
	if err != nil {
		return nil, fmt.Errorf("error retrieving device: %v", err)
	}
	if deviceBytes == nil {
		return nil, fmt.Errorf("device %s not found", deviceID)
	}

	var device Device
	err = json.Unmarshal(deviceBytes, &device)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling device: %v", err)
	}

	return &device, nil
}

// GetAuthEvents retrieves all authentication events for a device
func (s *SmartContract) GetAuthEvents(ctx contractapi.TransactionContextInterface, deviceID string) ([]*AuthEvent, error) {

	queryString := fmt.Sprintf(`{"selector":{"device_id":"%s","event_id":{"$regex":"auth-"}}}`, deviceID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("error querying auth events: %v", err)
	}
	defer resultsIterator.Close()

	var events []*AuthEvent
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("error iterating results: %v", err)
		}

		var event AuthEvent
		err = json.Unmarshal(queryResponse.Value, &event)
		if err != nil {
			return nil, fmt.Errorf("error unmarshalling event: %v", err)
		}
		events = append(events, &event)
	}

	return events, nil
}

// Helper function to calculate HMAC-SHA256
func calculateHMAC(secret string, payload string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// Helper function to calculate SHA256
func calculateSHA256(payload string) string {
	h := sha256.New()
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// main function for chaincode
func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating authentication chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting authentication chaincode: %v", err)
	}
}
