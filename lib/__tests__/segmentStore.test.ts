import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SegmentStore } from '../segmentStore';
import { SegmentData } from '../types';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('SegmentStore', () => {
  let segmentStore: SegmentStore;
  
  beforeEach(() => {
    segmentStore = new SegmentStore();
    ddbMock.reset();
  });
  
  afterEach(() => {
    ddbMock.reset();
  });
  
  describe('getSegmentData', () => {
    it('should retrieve segment data successfully', async () => {
      const mockItem = {
        PK: 'SEGMENT#tier1#kirana',
        SK: 'METADATA',
        entityType: 'SEGMENT',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };
      
      ddbMock.on(GetCommand).resolves({
        Item: mockItem
      });
      
      const result = await segmentStore.getSegmentData('tier1', 'kirana');
      
      expect(result).not.toBeNull();
      expect(result!.segmentKey).toBe('SEGMENT#tier1#kirana');
      expect(result!.medianHealthScore).toBe(70);
      expect(result!.medianMargin).toBe(0.20);
      expect(result!.sampleSize).toBe(350);
      expect(result!.lastUpdated).toBe('2024-01-15T10:00:00Z');
    });
    
    it('should return null when segment not found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined
      });
      
      const result = await segmentStore.getSegmentData('tier2', 'salon');
      
      expect(result).toBeNull();
    });
    
    it('should return null for incomplete segment data', async () => {
      const incompleteItem = {
        PK: 'SEGMENT#tier1#kirana',
        SK: 'METADATA',
        entityType: 'SEGMENT',
        medianHealthScore: 70
        // Missing medianMargin and sampleSize
      };
      
      ddbMock.on(GetCommand).resolves({
        Item: incompleteItem
      });
      
      const result = await segmentStore.getSegmentData('tier1', 'kirana');
      
      expect(result).toBeNull();
    });
    
    it('should handle network errors gracefully', async () => {
      ddbMock.on(GetCommand).rejects(new Error('Network error'));
      
      const result = await segmentStore.getSegmentData('tier1', 'kirana');
      
      expect(result).toBeNull();
    });
    
    it('should handle credential errors gracefully', async () => {
      const credError = new Error('Credentials error');
      (credError as any).name = 'CredentialsProviderError';
      
      ddbMock.on(GetCommand).rejects(credError);
      
      const result = await segmentStore.getSegmentData('tier1', 'kirana');
      
      expect(result).toBeNull();
    });
  });
  
  describe('saveSegmentData', () => {
    it('should save segment data successfully', async () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      ddbMock.on(PutCommand).resolves({});
      
      const result = await segmentStore.saveSegmentData(segmentData);
      
      expect(result).toBe(true);
      
      // Verify the command was called with correct parameters
      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls.length).toBe(1);
      expect(calls[0].args[0].input.Item).toMatchObject({
        PK: 'SEGMENT#tier1#kirana',
        SK: 'METADATA',
        entityType: 'SEGMENT',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      });
    });
    
    it('should return false on network error', async () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      ddbMock.on(PutCommand).rejects(new Error('Network error'));
      
      const result = await segmentStore.saveSegmentData(segmentData);
      
      expect(result).toBe(false);
    });
    
    it('should return false on credential error', async () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      const credError = new Error('Credentials error');
      (credError as any).name = 'UnrecognizedClientException';
      
      ddbMock.on(PutCommand).rejects(credError);
      
      const result = await segmentStore.saveSegmentData(segmentData);
      
      expect(result).toBe(false);
    });
  });
  
  describe('DynamoDB key format', () => {
    it('should use correct PK and SK format', async () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier2#pharmacy',
        medianHealthScore: 65,
        medianMargin: 0.15,
        sampleSize: 200,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      ddbMock.on(PutCommand).resolves({});
      
      await segmentStore.saveSegmentData(segmentData);
      
      const calls = ddbMock.commandCalls(PutCommand);
      expect(calls[0].args[0].input.Item?.PK).toBe('SEGMENT#tier2#pharmacy');
      expect(calls[0].args[0].input.Item?.SK).toBe('METADATA');
    });
    
    it('should query with correct PK and SK', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      
      await segmentStore.getSegmentData('tier3', 'restaurant');
      
      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls[0].args[0].input.Key).toEqual({
        PK: 'SEGMENT#tier3#restaurant',
        SK: 'METADATA'
      });
    });
  });
});
