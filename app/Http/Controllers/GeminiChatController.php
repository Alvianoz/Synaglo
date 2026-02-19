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

    /**
     * Clean and format AI response text
     * Removes markdown symbols for cleaner display and speech
     */
    private function cleanResponse($text)
    {
        // Remove markdown bold symbols (**)
        $text = preg_replace('/\*\*(.+?)\*\*/s', '$1', $text);

        // Remove markdown italic symbols (*)
        $text = preg_replace('/\*(.+?)\*/s', '$1', $text);

        // Remove markdown headers (###, ##, #)
        $text = preg_replace('/#{1,6}\s+/m', '', $text);

        // Convert markdown bullet points to dashes
        $text = preg_replace('/^\s*\*\s+/m', '• ', $text);

        // Clean up extra whitespace while preserving paragraphs
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        // Trim the result
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

        try {
            // Using the user-requested gemini-3-flash-preview model
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}";

            // Log the URL (masking key) for debugging
            Log::info('Gemini Request URL: ' . preg_replace('/key=[^&]+/', 'key=***', $url));

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post($url, [
                'system_instruction' => [
                    'parts' => [
                        [
                            'text' => "You are Dr. Synaglo, an empathetic, professional, and knowledgeable AI assistant who acts as both a psychologist and a medical doctor.\n\nContext: You are part of a monitoring dashboard app that receives data from a user's smartwatch to help manage and improve their mental health. You can reference trends, analytics, and health data from the smartwatch to provide personalized advice and support.\n\nYour goals:\n- Offer mental health support, guidance, and coping strategies as a psychologist.\n- Provide general medical information and advice as a doctor.\n- Always be empathetic, supportive, and non-judgmental.\n- Encourage healthy habits and self-care.\n- If the user presents a medical or mental health emergency, advise them to contact emergency services immediately.\n- ALWAYS include a disclaimer that you are an AI and not a substitute for professional medical or psychological advice, diagnosis, or treatment.\n- Keep your tone professional, calming, and supportive.\n- Format your response in a clear, simple way without using markdown symbols. Use bullet points with dashes and keep sentences clear."
                        ]
                    ]
                ],
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $message]
                        ]
                    ]
                ]
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $aiResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response from AI.';

                // Clean the response to remove markdown symbols
                $cleanResponse = $this->cleanResponse($aiResponse);

                return response()->json(['response' => $cleanResponse]);
            } else {
                Log::error('Gemini API Error: ' . $response->body());
                return response()->json([
                    'error' => 'Gemini API Error (' . $response->status() . '): ' . $response->body() . ' | Key used: ' . substr($apiKey, 0, 5) . '...'
                ], $response->status());
            }
        } catch (\Exception $e) {
            Log::error('Gemini Chat Exception: ' . $e->getMessage());
            return response()->json(['error' => 'An internal error occurred.'], 500);
        }
    }
}
