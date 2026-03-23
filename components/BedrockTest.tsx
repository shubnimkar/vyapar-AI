'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  testType?: string;
  prompt?: string;
  response?: string;
  error?: string;
  metadata?: {
    modelId: string;
    region: string;
    duration: string;
    stopReason?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  details?: any;
}

export default function BedrockTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [healthCheck, setHealthCheck] = useState<any>(null);

  const runTest = async (testType: string) => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/bedrock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/bedrock-test');
      const data = await response.json();
      setHealthCheck(data);
    } catch (error: any) {
      setHealthCheck({
        status: 'error',
        error: error.message,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">AWS Bedrock Test Suite</h2>
        <p className="text-neutral-600 mb-6">
          Test AWS Bedrock model invocation to diagnose any issues
        </p>

        {/* Health Check */}
        <div className="mb-6">
          <button
            onClick={checkHealth}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-700"
          >
            Check Configuration
          </button>
          
          {healthCheck && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-2">Configuration Status</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(healthCheck, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Buttons */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold">Run Tests:</h3>
          
          <button
            onClick={() => runTest('basic')}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Basic Test (Simple Response)'}
          </button>
          
          <button
            onClick={() => runTest('math')}
            disabled={loading}
            className="w-full px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Math Test (Calculation)'}
          </button>
          
          <button
            onClick={() => runTest('json')}
            disabled={loading}
            className="w-full px-4 py-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'JSON Test (Structured Output)'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className={`p-4 rounded border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              {result.success ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span>Test Passed</span>
                </>
              ) : (
                <>
                  <span className="text-red-600">✗</span>
                  <span>Test Failed</span>
                </>
              )}
            </h3>

            {result.success ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-neutral-700">Prompt:</p>
                  <p className="text-sm text-neutral-600 bg-white p-2 rounded mt-1">
                    {result.prompt}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-neutral-700">Response:</p>
                  <p className="text-sm text-neutral-900 bg-white p-2 rounded mt-1 font-mono">
                    {result.response}
                  </p>
                </div>

                {result.metadata && (
                  <div>
                    <p className="text-sm font-medium text-neutral-700">Metadata:</p>
                    <div className="text-sm bg-white p-2 rounded mt-1 space-y-1">
                      <p><span className="font-medium">Model:</span> {result.metadata.modelId}</p>
                      <p><span className="font-medium">Region:</span> {result.metadata.region}</p>
                      <p><span className="font-medium">Duration:</span> {result.metadata.duration}</p>
                      {result.metadata.usage && (
                        <p>
                          <span className="font-medium">Tokens:</span> {' '}
                          {result.metadata.usage.input_tokens} in / {result.metadata.usage.output_tokens} out
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-red-700">Error:</p>
                  <p className="text-sm text-red-600 bg-white p-2 rounded mt-1">
                    {result.error}
                  </p>
                </div>

                {result.details && (
                  <div>
                    <p className="text-sm font-medium text-red-700">Details:</p>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting Guide */}
      <div className="bg-primary-50 rounded-2xl p-6 border border-primary-200">
        <h3 className="font-semibold mb-3">Common Issues & Solutions:</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">AccessDeniedException:</span> Check IAM permissions for Bedrock access
          </li>
          <li>
            <span className="font-medium">ResourceNotFoundException:</span> Verify model ID and request model access in Bedrock console
          </li>
          <li>
            <span className="font-medium">ThrottlingException:</span> Too many requests - wait and retry
          </li>
          <li>
            <span className="font-medium">ValidationException:</span> Check request format and model parameters
          </li>
          <li>
            <span className="font-medium">Region issues:</span> Ensure model is available in your region (ap-south-1)
          </li>
        </ul>
      </div>
    </div>
  );
}
