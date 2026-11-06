import cv2
import mediapipe as mp
import numpy as np
import csv
import time
import os

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

def init_csv(filename="dataset.csv"):
    if not os.path.exists(filename):
        with open(filename, mode='w', newline='') as f:
            writer = csv.writer(f)
            header = ["class"]
            # 33 landmarks, each has x, y, z, v (visibility)
            for i in range(33):
                header.extend([f'x{i}', f'y{i}', f'z{i}', f'v{i}'])
            writer.writerow(header)
            print(f"Created new dataset file: {filename}")

def collect_data(class_name, num_frames=400):
    filename = "dataset.csv"
    init_csv(filename)
    
    cap = cv2.VideoCapture(0)
    print(f"\n--- GET READY ---")
    print(f"We will record {num_frames} frames for: {class_name}")
    print("Stand in front of camera. Starting in:")
    for i in range(5, 0, -1):
        print(f"{i}...")
        time.sleep(1)
        
    print("\n--- RECORDING STARTED ---")
    print("Move your body and perform the exercise...")
    frames_recorded = 0
    
    with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        with open(filename, mode='a', newline='') as f:
            writer = csv.writer(f)
            while cap.isOpened() and frames_recorded < num_frames:
                ret, frame = cap.read()
                if not ret: continue
                
                # Convert the BGR image to RGB
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image.flags.writeable = False
                results = pose.process(image)
                
                # Draw the pose annotation on the image
                image.flags.writeable = True
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                
                if results.pose_landmarks:
                    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
                    
                    # Extract Pose landmarks
                    row = [class_name]
                    for landmark in results.pose_landmarks.landmark:
                        row.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
                    
                    # Append class name and coordinates to the CSV
                    writer.writerow(row)
                    frames_recorded += 1
                
                # Show status on screen
                cv2.putText(image, f"Recording: {class_name}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.putText(image, f"Frames: {frames_recorded}/{num_frames}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                cv2.imshow('Data Collection', image)
                
                if cv2.waitKey(10) & 0xFF == ord('q'):
                    break
                    
    cap.release()
    cv2.destroyAllWindows()
    print("\n--- RECORDING COMPLETE ---")
    print(f"Added {frames_recorded} samples to dataset.csv")

if __name__ == "__main__":
    print("=== AI Gym Posture Data Collection ===")
    print("You can press 'q' at any time to stop recording early.")
    exercise_name = input("Enter the name of the exercise (e.g., 'Squat', 'Pushup', 'Idle'): ")
    collect_data(exercise_name, num_frames=500)
