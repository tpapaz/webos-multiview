cmake_minimum_required(VERSION 3.16)
project(multiview_sinks LANGUAGES CXX)

if(NOT CMAKE_CROSSCOMPILING OR NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Use the 32-bit ARM webOS SDK toolchain")
endif()

find_package(PkgConfig REQUIRED)
pkg_check_modules(SDL2 REQUIRED IMPORTED_TARGET sdl2)
find_library(SMP_LIBRARY playerAPIs REQUIRED)

add_executable(multiview-sinks main.cpp)
target_compile_features(multiview-sinks PRIVATE cxx_std_14)
target_compile_options(multiview-sinks PRIVATE -Wall -Wextra -Wpedantic -Werror)
target_link_libraries(multiview-sinks PRIVATE PkgConfig::SDL2 "${SMP_LIBRARY}")
set_target_properties(multiview-sinks PROPERTIES SKIP_BUILD_RPATH TRUE)
