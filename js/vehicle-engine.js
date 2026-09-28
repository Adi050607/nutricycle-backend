class VehicleEngine {

    constructor() {

        this.vehicle = null;

    }

    calculate(quantity, unit, shelfLifeHours = 24) {

        let weight = this.convertToKg(quantity, unit);

        let vehicle = "Bike";

        let eta = 15;

        let priority = "Normal";

        if (weight <= 5) {

            vehicle = "Bike";
            eta = 15;

        }

        else if (weight <= 20) {

            vehicle = "Car";
            eta = 25;

        }

        else if (weight <= 50) {

            vehicle = "Tempo";
            eta = 40;

        }

        else {

            vehicle = "Truck";
            eta = 60;

        }

        if (shelfLifeHours <= 4) {

            priority = "Critical";

            eta = Math.max(5, eta - 10);

        }

        else if (shelfLifeHours <= 8) {

            priority = "High";

            eta = Math.max(10, eta - 5);

        }

        this.vehicle = {

            weight,

            vehicle,

            eta,

            priority

        };

        return this.vehicle;

    }

    convertToKg(quantity, unit) {

        switch(unit){

            case "kg":

                return quantity;

            case "g":

                return quantity / 1000;

            case "mg":

                return quantity / 1000000;

            case "L":

                return quantity;

            case "ml":

                return quantity / 1000;

            default:

                return quantity;

        }

    }

    getVehicle(){

        return this.vehicle;

    }

}

const vehicleEngine = new VehicleEngine();

export default vehicleEngine;