/* 
 * Copyright 2012 Twitter, Inc.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.twitter.hdfsdu;

import java.io.IOException;
import java.io.StringWriter;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.PreparedStatement;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import javax.servlet.http.HttpServletRequest;

import org.codehaus.jackson.JsonGenerationException;
import org.codehaus.jackson.map.JsonMappingException;
import org.codehaus.jackson.map.ObjectMapper;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.twitter.common.net.http.handlers.TextResponseHandler;

public class SizeByPathServlet extends TextResponseHandler {
	private static final Logger LOG = Logger.getLogger(SizeByPathServlet.class.getName());

	public SizeByPathServlet() {
		super("application/json");
	}

	public ResultSet getSizeByPath(HttpServletRequest request) throws SQLException {
		String paramPath = request.getParameter("path");
		if (paramPath == null) {
			paramPath = "/";
		}
		int paramPathDepth = paramPath.split("/").length == 0 ? 0 : paramPath
				.split("/").length - 1;
		LOG.info("Depth of " + paramPath + " is " + paramPathDepth);

		Integer paramDepth = request.getParameter("depth") == null ? 2
				: Integer.parseInt(request.getParameter("depth"));
		paramDepth += paramPathDepth;

		Integer paramLimit = request.getParameter("limit") == null ? 100
				: Integer.parseInt(request.getParameter("limit"));


        long start = System.nanoTime();
        ResultSet sizeByPathResultSet = doSizeByPathQuery(paramPath, paramDepth, paramLimit);
        long end = System.nanoTime();

        long query_elapsed_msec = (end - start)/1000000;
        LOG.info("Query time: " + query_elapsed_msec + " ms.");

        return sizeByPathResultSet;
	}

    private ResultSet doSizeByPathQuery(String path, Integer depth, Integer limit) throws SQLException {
	PreparedStatement statement;
	int parameterIndex = 1;

        if (path.equals("/")) {
		statement = HdfsDu.conn.prepareStatement("select * from size_by_path "
				+ "where (path like ?) and path_depth <= ? "
				+ "order by path limit ?");
		statement.setString(parameterIndex++, path + "%");
		statement.setInt(parameterIndex++, depth);
		statement.setInt(parameterIndex++, limit);
        } else {
		statement = HdfsDu.conn.prepareStatement("select * from size_by_path "
				+ "where (path like ? or path = ?) and path_depth <= ? "
				+ "order by path limit ?");
		statement.setString(parameterIndex++, path + "/%");
		statement.setString(parameterIndex++, path);
		statement.setInt(parameterIndex++, depth);
		statement.setInt(parameterIndex++, limit);
        }
	LOG.info("Running query: " + statement);

	return statement.executeQuery();
    }


	@Override
	public Iterable<String> getLines(HttpServletRequest request) {
		List<String> lines = Lists.newLinkedList();
		ObjectMapper mapper = new ObjectMapper();

    try {
			List<Map<String, String>> results = Lists.newArrayList();
			ResultSet resultSet = getSizeByPath(request);

			while (resultSet.next()) {
				Map<String, String> entry = Maps.newHashMap();
				entry.put("path", resultSet.getString("path"));
                entry.put("bytes", resultSet.getString("size_in_bytes"));
                entry.put("count", resultSet.getString("file_count"));
                entry.put("leaf", resultSet.getString("leaf"));
				results.add(entry);
			}
            LOG.info("Query returned " + results.size() + " results.");

			StringWriter stringWriter = new StringWriter();
			mapper.writeValue(stringWriter, results);
			lines.add(stringWriter.toString());
		} catch (SQLException e) {
			e.printStackTrace();
		} catch (JsonMappingException e) {
			e.printStackTrace();
		} catch (JsonGenerationException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		}

		return lines;
	}
}
