#!/bin/bash

echo "=== Environment Variable Test ==="
echo "Checking if .env.local exists..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    echo "Contents:"
    cat .env.local
else
    echo "❌ .env.local does not exist"
    echo "Creating .env.local with template..."
    echo "NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here" > .env.local
    echo "✅ .env.local created"
    echo "Please edit .env.local and replace 'your_gemini_api_key_here' with your actual API key"
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
fi

echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your real Gemini API key"
echo "2. Restart your development server: npm run dev"
echo "3. Check the browser console for environment variable status"
