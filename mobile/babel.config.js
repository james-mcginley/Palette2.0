module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last per the Reanimated docs.
    plugins: ['react-native-reanimated/plugin'],
  };
};
