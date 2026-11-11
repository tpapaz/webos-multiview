cmake_minimum_required(VERSION 3.16)
project(multiview_endurance LANGUAGES CXX)

if(NOT CMAKE_CROSSCOMPILING OR NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Use the 32-bit ARM webOS SDK toolchain")
endif()

find_package(PkgConfig REQUIRED)
pkg_check_modules(SDL2 REQUIRED IMPORTED_TARGET sdl2)
pkg_check_modules(GLIB REQUIRED IMPORTED_TARGET glib-2.0)
find_library(LUNA_LIBRARY luna-service2 REQUIRED)
find_library(JSON_C_LIBRARY json-c REQUIRED)
find_library(SMP_LIBRARY playerAPIs REQUIRED)

add_executable(multiview-endurance main.cpp)
target_compile_features(multiview-endurance PRIVATE cxx_std_14)
target_compile_options(multiview-endurance PRIVATE -Wall -Wextra -Wpedantic -Werror)
# Retail C1 LS2 references fcntl@GLIBC_2.28, absent from the newer SDK libc.
# Leave shared-library internals to the C1 runtime; verify every executable
# import and exact DT_NEEDED provider against the firmware before packaging.
target_link_options(multiview-endurance PRIVATE "-Wl,--allow-shlib-undefined")
target_link_libraries(multiview-endurance PRIVATE PkgConfig::SDL2 PkgConfig::GLIB
  "${SMP_LIBRARY}" "${LUNA_LIBRARY}" "${JSON_C_LIBRARY}")
set_target_properties(multiview-endurance PROPERTIES SKIP_BUILD_RPATH TRUE)
