# --------------------------------------------------------------------------------------------------
# VPC
# --------------------------------------------------------------------------------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = var.vpc_name
    Project = "scoutos"
  }
}

# --------------------------------------------------------------------------------------------------
# Gateways
# --------------------------------------------------------------------------------------------------
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name    = "${var.vpc_name}-igw"
    Project = "scoutos"
  }
}

# A public subnet is required for the NAT Gateway
resource "aws_subnet" "public" { # tfsec:ignore:aws-ec2-no-public-ip-subnet
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.255.0/24" # A dedicated CIDR for the public subnet
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a" # Assuming 'a' AZ for simplicity

  tags = {
    Name    = "${var.vpc_name}-public-subnet"
    Project = "scoutos"
  }
}

resource "aws_eip" "nat" {
  vpc = true
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name    = "${var.vpc_name}-nat-gw"
    Project = "scoutos"
  }

  depends_on = [aws_internet_gateway.gw]
}

# --------------------------------------------------------------------------------------------------
# Routing
# --------------------------------------------------------------------------------------------------
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name    = "${var.vpc_name}-public-rt"
    Project = "scoutos"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name    = "${var.vpc_name}-private-rt"
    Project = "scoutos"
  }
}

# --------------------------------------------------------------------------------------------------
# Private Subnets
# --------------------------------------------------------------------------------------------------
resource "aws_subnet" "private" {
  count                   = length(var.private_subnet_cidr_blocks)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidr_blocks[count.index]
  map_public_ip_on_launch = false
  # Cycle through availability zones
  availability_zone       = "${var.aws_region}${element(["a", "b", "c"], count.index)}"

  tags = {
    Name    = "${var.vpc_name}-private-subnet-${count.index + 1}"
    Project = "scoutos"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidr_blocks)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --------------------------------------------------------------------------------------------------
# VPC Endpoints
# --------------------------------------------------------------------------------------------------
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.private.id]
}

resource "aws_vpc_endpoint" "kms" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.kms"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# --------------------------------------------------------------------------------------------------
# VPC Flow Logs
# --------------------------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc-flow-logs/${var.vpc_name}"
  retention_in_days = 30
  kms_key_id        = var.kms_key_arn
}

resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs_role.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id
}

resource "aws_iam_role" "flow_logs_role" {
  name = "${var.vpc_name}-flow-logs-role"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume_role.json
}

data "aws_iam_policy_document" "flow_logs_assume_role" {
  statement {
    actions = "sts:AssumeRole"
    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "flow_logs_policy" {
  name   = "${var.vpc_name}-flow-logs-policy"
  role   = aws_iam_role.flow_logs_role.id
  policy = data.aws_iam_policy_document.flow_logs_policy_doc.json
}

data "aws_iam_policy_document" "flow_logs_policy_doc" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = [aws_cloudwatch_log_group.flow_logs.arn]
  }
}