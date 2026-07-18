const path = require('path');
const FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');

module.exports = function(env) {
    return {
        entry: {
            preload: "./src/preload.js"
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "../app"),
        },
        target: 'electron-preload',
        mode: env && env.length ? env : "production",
        
        node: {
            __dirname: false,
            __filename: false
        },
            
        externals: [],
        
        resolve: {
            extensions: ['.*', '.ts', '.js'],
            mainFields: ["preload"],
            alias: {
                env: path.resolve(__dirname, `../config/env_${env}.json`),
                '~': path.resolve(__dirname, '../src/')
            }
        },

        devtool: "source-map",

        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: "babel-loader"
                    }
                }
            ]
        },
    
        plugins: [
            new FriendlyErrorsWebpackPlugin({
                clearConsole: env === "development",
                onErrors: function (severity, errors) {
                    console.log({severity, errors})
                },
            })
        ]
    };
};
