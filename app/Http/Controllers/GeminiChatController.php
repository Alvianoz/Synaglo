<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiChatController extends Controller
{
    public function index()
    {
        return view('gemini-chat');
    }

    private function cleanResponse($text)
    {
        $text = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text);
        $text = preg_replace('/\*(.+?)\*/s', '$1', $text);
        $text = preg_replace('/#{1,6}\s+/m', '', $text);
        $text = preg_replace('/^\s*\*\s+/m', '• ', $text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        return trim($text);
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $message = $request->input('message');
        $apiKey = config('services.gemini.api_key');

        if (!$apiKey) {
            return response()->json(['error' => 'Gemini API Key is missing.'], 500);
        }

        $systemPrompt = "You are Dr. Synachat, an empathetic, professional, and knowledgeable AI assistant who acts as both a psychologist and a medical doctor. You are part of a smartwatch health monitoring app. Offer mental health support, medical information, and always encourage the user to seek professional help. Always include a disclaimer that you are an AI. Keep responses clear and supportive without markdown symbols.";

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}";

            $body = [
                'system_instruction' => [
                    'parts' => [
                        ['text' => $systemPrompt]
                    ]
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $message]
                        ]
                    ]
                ]
            ];

            Log::info('Gemini request to: ' . preg_replace('/key=\S+/', 'key=***', $url));
            Log::info('Gemini request body: ' . json_encode($body));

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->retry(3, 1000)->post($url, $body);

            Log::info('Gemini response status: ' . $response->status());
            Log::info('Gemini response body: ' . $response->body());

            if ($response->successful()) {
                $data = $response->json();
                $aiResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response from AI.';
                return response()->json(['response' => $this->cleanResponse($aiResponse)]);
            } else {
                $errorData = $response->json();
                $errorMessage = $errorData['error']['message'] ?? $response->body();
                Log::error('Gemini API Error: ' . $response->status() . ' - ' . $response->body());
                return response()->json(['error' => $errorMessage], $response->status());
            }

        } catch (\Exception $e) {
            Log::error('Gemini Chat Exception: ' . $e->getMessage());
            return response()->json(['error' => 'An internal error occurred: ' . $e->getMessage()], 500);
        }
    }
}