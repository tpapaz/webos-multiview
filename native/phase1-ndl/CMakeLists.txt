cmake_minimum_required(VERSION 3.16)
project(multiview_ndl LANGUAGES C CXX)

if(NOT CMAKE_CROSSCOMPILING OR NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Use the 32-bit ARM webOS SDK toolchain")
endif()

find_package(PkgConfig REQUIRED)
pkg_check_modules(SDL2 REQUIRED IMPORTED_TARGET sdl2)
find_library(NDL_LIBRARY NDL_directmedia REQUIRED)

add_executable(multiview-ndl main.cpp directmedia.c)
target_compile_features(multiview-ndl PRIVATE c_std_99 cxx_std_14)
target_compile_options(multiview-ndl PRIVATE -Wall -Wextra -Wpedantic -Werror)
target_link_libraries(multiview-ndl PRIVATE PkgConfig::SDL2 "${NDL_LIBRARY}")
set_target_properties(multiview-ndl PROPERTIES SKIP_BUILD_RPATH TRUE)
