"use client";

import { useEffect, useState } from 'react';

export default function EnvTestPage() {
  const [envInfo, setEnvInfo] = useState<any>({});

  useEffect(() => {
    // 只在客户端运行
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    setEnvInfo({
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...' || 'undefined',
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variable Test</h1>
      <div style={{ background: '#f5f5f5', padding: '10px', marginTop: '10px' }}>
        <h2>NEXT_PUBLIC_GEMINI_API_KEY Status:</h2>
        <p>Has API Key: {envInfo.hasApiKey ? '✅ YES' : '❌ NO'}</p>
        <p>API Key Length: {envInfo.apiKeyLength}</p>
        <p>API Key Prefix: {envInfo.apiKeyPrefix}</p>
        
        <h2>All NEXT_PUBLIC_ Variables:</h2>
        <ul>
          {envInfo.allEnvVars?.map((key: string) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', border: '1px solid #ffeaa7' }}>
        <h3>Instructions:</h3>
        <p>1. Make sure you have a .env.local file in your project root</p>
        <p>2. Add this line to .env.local:</p>
        <code>NEXT_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key_here</code>
        <p>3. Restart your development server</p>
        <p>4. Get your API key from: <a href="https://makersuite.google.com/app/apikey" target="_blank">https://makersuite.google.com/app/apikey</a></p>
      </div>
    </div>
  );
}
