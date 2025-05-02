from flask import Flask, render_template, jsonify
from threading import Thread
import time
import random

app = Flask(__name__)

# Global data structure to simulate graph values
graph_data = {
    "chunks": [],
    "speeds": []
}

# Background thread to simulate the file transfer
def simulate_transfer():
    graph_data["chunks"].clear()
    graph_data["speeds"].clear()

    for i in range(1, 21):
        speed = random.randint(100, 500)  # KB/s
        graph_data["chunks"].append(i)
        graph_data["speeds"].append(speed)
        time.sleep(0.5)

    print("[✔] Transfer simulation complete.")

# Web Routes
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/start-transfer")
def start_transfer():
    Thread(target=simulate_transfer).start()
    return jsonify({"status": "started"})

@app.route("/get-graph-data")
def get_graph_data():
    return jsonify(graph_data)

@app.route('/get-locations')
def get_locations():
    def random_location():
        return {
            'lat': round(random.uniform(-90, 90), 4),
            'lng': round(random.uniform(-180, 180), 4)
        }

    return jsonify({
        'client': random_location(),
        'server': random_location()
    })

# Entry point
if __name__ == "__main__":
    app.run(debug=True)
