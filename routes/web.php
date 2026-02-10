<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('landing-page');
});

Route::get('/dashboard', function (){
    return view('dashboard');
});

Route::get('/analytics', function (){
    return view('analytics');
});

Route::get('/health', function (){
    return view('health');
});

Route::get('/recommendations', function (){
    return view('recommendations');
});

Route::get('/profile', function (){
    return view('profile');
});

Route::get('/auth', function (){
    return view('auth');
});