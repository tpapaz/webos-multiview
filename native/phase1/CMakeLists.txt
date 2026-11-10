cmake_minimum_required(VERSION 3.16)
project(multiview_phase1 LANGUAGES CXX)

if(NOT CMAKE_CROSSCOMPILING OR NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Use the 32-bit ARM webOS SDK toolchain")
endif()

find_package(PkgConfig REQUIRED)
pkg_check_modules(SDL2 REQUIRED IMPORTED_TARGET sdl2)
find_library(SMP_LIBRARY playerAPIs REQUIRED)

add_executable(multiview-phase1 main.cpp)
target_compile_features(multiview-phase1 PRIVATE cxx_std_14)
target_compile_options(multiview-phase1 PRIVATE -Wall -Wextra -Wpedantic -Werror)
target_link_libraries(multiview-phase1 PRIVATE PkgConfig::SDL2 "${SMP_LIBRARY}")
set_target_properties(multiview-phase1 PROPERTIES SKIP_BUILD_RPATH TRUE)
