import sys
import os

# Add _backend to the system path so that imports from app work correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_backend"))

from app.main import app
