import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
import pickle
import os

print("=== AI Gym Posture Model Training ===")

dataset_file = 'dataset.csv'
if not os.path.exists(dataset_file):
    print(f"Error: Could not find {dataset_file}! Please run collect_data.py first to create data.")
    exit(1)

print(f"Loading dataset: {dataset_file}")
df = pd.read_csv(dataset_file)

# The first column 'class' is our target label, the rest are our x,y,z,v features
X = df.drop('class', axis=1)
y = df['class']

print(f"Dataset loaded. Total samples: {len(df)}")
print(f"Total features per sample: {X.shape[1]}")

# Convert labels (e.g. 'Squat', 'Pushup') into numbers (0, 1, ...)
encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)
y_categorical = tf.keras.utils.to_categorical(y_encoded)

# Save the encoder mapping so our backend knows which number means which exercise
with open('label_classes.pkl', 'wb') as f:
    pickle.dump(encoder.classes_, f)

print(f"Classes found: {encoder.classes_}")

# Split into Training (80%) and Testing (20%) sets
X_train, X_test, y_train, y_test = train_test_split(X, y_categorical, test_size=0.2, random_state=42)

# Build a fast Dense Neural Network
# We have 132 input features (33 landmarks * 4 coordinates each)
# This simple architecture is insanely fast and works perfectly for coordinates.
model = Sequential([
    Dense(128, activation='relu', input_shape=(X.shape[1],)),
    Dropout(0.2), # Dropout prevents overfitting
    Dense(64, activation='relu'),
    Dropout(0.2),
    Dense(32, activation='relu'),
    Dense(y_categorical.shape[1], activation='softmax') # Softmax outputs probabilities for each class
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

print("\n--- Training Model ---")
# Train the model mapping coords -> exercise
history = model.fit(
    X_train, y_train,
    epochs=50,
    batch_size=32,
    validation_data=(X_test, y_test)
)

print("\n--- Evaluation on Test Data ---")
loss, accuracy = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {accuracy*100:.2f}%")

# Save the compiled model as a .h5 file for the backend to use
model.save('exercise_classifier.h5')
print("\nSuccess! Training Finished.")
print("- Model saved as: 'exercise_classifier.h5'")
print("- Label map saved as: 'label_classes.pkl'")
print("\nYou are now ready to integrate this into backend/main.py!")
