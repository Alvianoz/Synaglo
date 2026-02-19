<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Handle user registration
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $user = \App\Models\User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => \Illuminate\Support\Facades\Hash::make($request->password),
        ]);

        // Log the user in
        \Illuminate\Support\Facades\Auth::login($user);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful',
            'redirect' => '/dashboard'
        ]);
    }

    /**
     * Handle user login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $credentials = $request->only('email', 'password');
        $remember = $request->boolean('remember', false);

        if (\Illuminate\Support\Facades\Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'redirect' => '/dashboard',
                'user' => [
                    'name' => \Illuminate\Support\Facades\Auth::user()->name,
                    'email' => \Illuminate\Support\Facades\Auth::user()->email,
                ]
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid email or password'
        ], 401);
    }
}
