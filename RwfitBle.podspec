require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RwfitBle"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform     = :ios, "12.0"
  s.source       = { :git => package["repository"]["url"], :tag => "v#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/*.h"
  s.vendored_frameworks = "ios/Frameworks/DHBleSDK.framework"
  s.frameworks = "CoreBluetooth"

  # The current vendor framework is an iPhoneOS arm64 binary. RWFIT BLE is
  # therefore intentionally device-only until an XCFramework is supplied.
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "arm64 i386"
  }

  install_modules_dependencies(s)
end
