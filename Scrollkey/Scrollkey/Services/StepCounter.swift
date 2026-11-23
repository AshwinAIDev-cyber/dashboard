import CoreMotion
import Foundation
import Observation

/// Live step count since a start date, from the iPhone's motion coprocessor.
/// Steps taken while the phone is locked are included when updates resume.
@Observable
final class StepCounter {
    private(set) var steps = 0
    private(set) var errorMessage: String?

    @ObservationIgnored private let pedometer = CMPedometer()

    var isAvailable: Bool { CMPedometer.isStepCountingAvailable() }

    func start(from date: Date) {
        errorMessage = nil
        guard isAvailable else {
            errorMessage = "Step counting isn't available on this device."
            return
        }
        switch CMPedometer.authorizationStatus() {
        case .denied, .restricted:
            errorMessage = "Motion & Fitness access is off. Turn it on for Scrollkey in Settings › Privacy & Security."
            return
        default:
            break
        }
        pedometer.stopUpdates()
        pedometer.startUpdates(from: date) { [weak self] data, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error = error as NSError? {
                    if error.domain == CMErrorDomain, error.code == Int(CMErrorMotionActivityNotAuthorized.rawValue) {
                        self.errorMessage = "Motion & Fitness access is off. Turn it on for Scrollkey in Settings › Privacy & Security."
                    } else {
                        self.errorMessage = "The step counter hit a snag: \(error.localizedDescription)"
                    }
                    return
                }
                if let count = data?.numberOfSteps.intValue {
                    self.steps = max(self.steps, count)
                }
            }
        }
    }

    func stop() {
        pedometer.stopUpdates()
    }

    /// Debug helper for the simulator, which has no motion hardware.
    func simulate(_ extra: Int) {
        steps += extra
    }
}
