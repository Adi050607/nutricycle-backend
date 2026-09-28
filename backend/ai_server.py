from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import random

app = Flask(__name__)
CORS(app)

model = YOLO("yolov8n.pt")

@app.route("/scan-food", methods=["POST"])
def scan_food():
    try:
        if "image" not in request.files:
            return jsonify({"result": "no_food"})

        file = request.files["image"]
        image = Image.open(file.stream)

        results = model(image)

        labels = []
        if results[0].boxes is not None:
            for c in results[0].boxes.cls:
                labels.append(model.names[int(c)])

        print("Detected:", labels)

        food_items = ["apple","banana","pizza","sandwich","cake","orange","bowl","cup","bottle"]
        animals = ["dog","cat","cow","horse"]

        for item in food_items:
            if item in labels:
                return jsonify({
                    "result": "food_detected",
                    "food": item,
                    "shelf_life": str(random.randint(1,5)) + " days"
                })

        if "person" in labels:
            return jsonify({"result": "human_detected"})

        if any(a in labels for a in animals):
            return jsonify({"result": "animal_detected"})

        return jsonify({"result": "no_food"})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"result": "error"})
@app.route("/")
def home():
    return "AI Server Running"
if __name__ == "__main__":
    app.run(port=5000)