# --------------------------------------------------------------------------------------------------
# Security Group for VPC Interface Endpoints
# --------------------------------------------------------------------------------------------------
resource "aws_security_group" "vpc_endpoints" { # tfsec:ignore:aws-ec2-no-public-egress-sgr
  name        = "${var.vpc_name}-endpoints-sg"
  description = "Allow TLS traffic to VPC endpoints from within the VPC"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Allow HTTPS from within the VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # Allow all outbound traffic
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name    = "${var.vpc_name}-endpoints-sg"
    Project = "scoutos"
  }
}