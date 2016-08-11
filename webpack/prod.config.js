const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	devtool: 'source-map',
	module: {
		loaders: [
	      	{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract('style-loader', 'css-loader', 'postcss-loader')
			}
		],
	},
	plugins: [
		new webpack.DefinePlugin({
	      	'process.env': {
	        	NODE_ENV: '"production"',
	      	},
	      	__DEVELOPMENT__: false,
	    }),
	    new ExtractTextPlugin('[name].css'),
	    new webpack.optimize.UglifyJsPlugin({
	      compress:{
	        warnings: true
	      }
	    }),
	    new webpack.optimize.DedupePlugin(),
    	new webpack.optimize.OccurenceOrderPlugin(),
	],
}