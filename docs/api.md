# MediBook API Specification

All API endpoints follow RESTful conventions using plural nouns. Unless otherwise noted, request and response bodies use JSON (`application/json`).

## Endpoints Summary

| Method | Path | Controller | Success Code | Error Codes | Description |
|---|---|---|---|---|---|
| **POST** | `/api/patients` | `patientController.createPatient` | `201 Created` | `400`, `409` | Register a new patient. `409` returned on duplicate email. |
| **GET** | `/api/patients` | `patientController.getPatients` | `200 OK` | - | Retrieve all registered patients. |
| **GET** | `/api/patients/:id` | `patientController.getPatientById` | `200 OK` | `400`, `404` | Retrieve details for a specific patient by ID. |
| **PUT** | `/api/patients/:id` | `patientController.updatePatient` | `200 OK` | `400`, `404`, `409` | Update patient name, email, or phone. `409` on email conflict. |
| **DELETE** | `/api/patients/:id` | `patientController.deletePatient` | `200 OK` | `400`, `404`, `409` | Delete a patient. Returns `409` if patient has appointments. |
| **POST** | `/api/doctors` | `doctorController.createDoctor` | `201 Created` | `400` | Register a doctor with specialty, fee, room. |
| **GET** | `/api/doctors` | `doctorController.getDoctors` | `200 OK` | - | Retrieve all registered doctors. |
| **GET** | `/api/doctors/:id` | `doctorController.getDoctorById` | `200 OK` | `400`, `404` | Retrieve details for a specific doctor by ID. |
| **PUT** | `/api/doctors/:id` | `doctorController.updateDoctor` | `200 OK` | `400`, `404` | Update doctor specialty, consultation fee, room. |
| **DELETE** | `/api/doctors/:id` | `doctorController.deleteDoctor` | `200 OK` | `400`, `404`, `409` | Delete a doctor. Returns `409` if doctor has appointments. |
| **POST** | `/api/appointments` | `appointmentController.bookAppointment` | `201 Created` | `400`, `404`, `409`, `422` | Book an appointment slot. Returns `409` if slot taken, `422` if daily cap reached or off-hours. Offers waitlist on `409`/`422`. |
| **DELETE** | `/api/appointments/:id` | `appointmentController.cancelAppointment` | `200 OK` | `400`, `404`, `409` | Cancel an appointment and generate refund record. Returns refund amount in body. `409` if already cancelled. |
| **POST** | `/api/appointments/waitlist` | `appointmentController.joinWaitlist` | `201 Created` | `400`, `404`, `422` | Join the Redis waitlist for a doctor on a specific date/slot. Returns queue position. |
| **GET** | `/api/doctors/:id/stats` | `statsController.getDoctorStats` | `200 OK` | `400`, `404` | Doctor stats: net revenue, upcoming count, appointments per day for next 7 days, daily utilization %. |
| **GET** | `/api/reports/doctors` | `statsController.getDoctorsReport` | `200 OK` | - | Aggregated clinic report: total appointments and net revenue per doctor (including 0-appointment doctors). |
| **GET** | `/api/reports/busy-days` | `statsController.getBusyDaysReport` | `200 OK` | - | Report of every (doctor, date) where booked capacity exceeds 80% (> 9 appointments). |
| **GET** | `/feedback` | `feedbackController.renderFeedbackPage` | `200 OK` | - | Server-rendered HTML course feedback form in English (`en`) or Kinyarwanda (`rw`), default/fallback `en`. |
| **GET** | `/health` | Inlined / Health check | `200 OK` | - | Basic liveness and service health verification probe. |
