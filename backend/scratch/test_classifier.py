import sys
import os
from dotenv import load_dotenv

# Add the app directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv()

from app.services.literature_classifier import verify_literature_content

# Test samples
LITERATURE_SAMPLE = """
Title: The Great Gatsby
Author: F. Scott Fitzgerald
Chapter 1
In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.
"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven't had the advantages that you've had."
He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. 
In consequence, I'm inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores. 
The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men. 
"""

CS_SAMPLE = """
Deep Learning for Image Recognition
Abstract: We present a novel convolutional neural network architecture that achieves state-of-the-art performance on the ImageNet dataset.
Our model uses skip connections and batch normalization to improve training stability.
Keywords: CNN, Deep Learning, Computer Vision, Backpropagation.
Introduction:
Artificial Intelligence has seen rapid growth in recent years. Specifically, image recognition has become a core task for many applications...
"""

def test():
    print("Testing Literature Sample...")
    res1 = verify_literature_content(LITERATURE_SAMPLE)
    print(f"Result: {res1}")
    
    print("\nTesting Computer Science Sample...")
    res2 = verify_literature_content(CS_SAMPLE)
    print(f"Result: {res2}")

if __name__ == "__main__":
    test()
