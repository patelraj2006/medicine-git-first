#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Building backend..."
cd backend
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
cd ..
