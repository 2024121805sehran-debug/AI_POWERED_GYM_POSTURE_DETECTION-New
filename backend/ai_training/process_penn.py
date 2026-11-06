import os
import cv2
import csv
import glob
import scipy.io as sio
import mediapipe as mp
import tarfile

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

def extract_dataset(tar_path, extract_path="Penn_Action"):
    if not os.path.exists(extract_path):
        print(f"Extracting {tar_path} to {extract_path}...")
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(path=extract_path)
        print("Extraction complete!")
    return extract_path

def init_csv(filename="dataset.csv"):
    with open(filename, mode='w', newline='') as f:
        writer = csv.writer(f)
        header = ["class"]
        for i in range(33):
            header.extend([f'x{i}', f'y{i}', f'z{i}', f'v{i}'])
        writer.writerow(header)

def process_penn_action(tar_path):
    print("=== Penn Action Dataset Processor ===")
    out_csv = "dataset.csv"
    init_csv(out_csv)
    
    extract_path = "Penn_Action"
    if tar_path.endswith(".tar.gz"):
        extract_dataset(tar_path, extract_path)
    else:
        extract_path = tar_path # Assume they provided the extracted folder
    
    labels_dir = os.path.join(extract_path, "labels")
    frames_dir = os.path.join(extract_path, "frames")
    
    # Penn_Action.tar.gz usually extracts to a folder named 'Penn_Action' inside the target directory
    if not os.path.exists(labels_dir):
        alt_path = os.path.join(extract_path, "Penn_Action")
        if os.path.exists(alt_path):
            labels_dir = os.path.join(alt_path, "labels")
            frames_dir = os.path.join(alt_path, "frames")
            
    if not os.path.exists(labels_dir):
        print(f"Error: Could not find 'labels' directory in {extract_path}.")
        print("Expected to find labels/ and frames/ inside the dataset folder.")
        return

    mat_files = glob.glob(os.path.join(labels_dir, "*.mat"))
    print(f"Found {len(mat_files)} video sequences. Processing...")
    
    with open(out_csv, mode='a', newline='') as f:
        writer = csv.writer(f)
        total_frames = 0
        
        for idx, mat_path in enumerate(mat_files):
            # Load the MATLAB file
            try:
                mat = sio.loadmat(mat_path)
                # The action name is stored as an array of strings in MATLAB
                action = str(mat['action'][0])
            except Exception as e:
                continue
                
            vid_id = os.path.splitext(os.path.basename(mat_path))[0]
            vid_frames_dir = os.path.join(frames_dir, vid_id)
            
            if not os.path.exists(vid_frames_dir):
                continue
                
            frame_files = sorted(glob.glob(os.path.join(vid_frames_dir, "*.jpg")))
            
            for frame_file in frame_files:
                image = cv2.imread(frame_file)
                if image is None: continue
                
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = pose.process(image_rgb)
                
                if results.pose_landmarks:
                    row = [action]
                    for landmark in results.pose_landmarks.landmark:
                        row.extend([landmark.x, landmark.y, landmark.z, landmark.visibility])
                    writer.writerow(row)
                    total_frames += 1
                    
            if (idx + 1) % 50 == 0:
                print(f"Processed {idx + 1}/{len(mat_files)} sequences... (Extracted {total_frames} valid poses so far)")
                
    print(f"\nProcessing Complete! Extracted a total of {total_frames} pose frames.")
    print("You can now run 'python train_model.py' to train your Deep Learning Model!")

if __name__ == "__main__":
    tar_path = input("Enter the absolute path to your Penn_Action.tar.gz file (or the extracted folder): ").strip()
    # Remove quotes if user dragged the file into the terminal
    tar_path = tar_path.strip('"').strip("'")
    if os.path.exists(tar_path):
        process_penn_action(tar_path)
    else:
        print("File not found! Make sure you typed the exact path correctly.")
